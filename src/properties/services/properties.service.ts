import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from '../entities/property.entity';
import { Neighborhood } from '../../neighborhoods/entities/neighborhood.entity';
import {
  AdminPropertyFiltersDto,
  CreatePropertyDto,
  UpdatePropertyDto,
} from '../dto';
import {
  buildPropertySlug,
  formatPropertyCode,
} from '../helpers/property-identifiers';
import { assertPublicationTransition } from '../helpers/property-lifecycle';
import { isDealStatusAllowedForOperation } from '../helpers/deal-status-rule';
import {
  buildAdminPropertyQuery,
  NEIGHBORHOOD_ALIAS,
  PROPERTY_ALIAS,
} from '../helpers/property-query.builder';
import {
  PublicationStatus,
  DealStatus,
  Operation,
} from '../enums/property.enums';
import { AuditLogService } from '../../audit/audit-log.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { AuditActor } from '../../audit/interfaces/audit-actor.interface';
import { Paginated } from '../../common/interfaces/paginated.interface';
import { STORAGE_PORT } from '../../media/storage/storage.port';
import type { StoragePort } from '../../media/storage/storage.port';
import { MediaUrlBuilder } from '../../media/media-url.builder';
import { PropertyImagesRepository } from '../images/property-images.repository';
import { propertyMediaPrefix } from '../images/property-image-keys';
import {
  PropertyImageResponse,
  toPropertyImageResponse,
} from '../helpers/property-image.mapper';

/**
 * `CreatePropertyDto` keys that `update()` diffs and applies generically.
 * `code`, `slug`, `publicationStatus`, `dealStatus`, `firstPublishedAt` are
 * never in the DTO type. `neighborhoodId` is intentionally excluded from
 * this generic list: it maps to a relation (`property.neighborhood`), not a
 * scalar column, so it is resolved separately in `update()` using the same
 * lookup-or-reject rule as `create()`.
 */
const UPDATABLE_FIELDS = [
  'operation',
  'type',
  'title',
  'description',
  'address',
  'showExactAddress',
  'currency',
  'price',
  'expenses',
  'rooms',
  'bedrooms',
  'bathrooms',
  'hasGarage',
  'coveredArea',
  'totalArea',
  'age',
  'creditEligible',
  'petsAllowed',
  'immediateAvailability',
  'marketingTag',
  'featured',
  'hasWater',
  'hasNaturalGas',
  'hasSewer',
  'hasElectricity',
  'hasInternet',
] as const;

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(Neighborhood)
    private readonly neighborhoodRepository: Repository<Neighborhood>,
    private readonly auditLogService: AuditLogService,
    @Inject(STORAGE_PORT) private readonly storagePort: StoragePort,
    private readonly propertyImagesRepository: PropertyImagesRepository,
    private readonly mediaUrlBuilder: MediaUrlBuilder,
  ) {}

  /**
   * Crea una propiedad en estado `draft`. El código se reserva explícitamente
   * de `property_code_seq` antes del insert para poder derivar el slug con
   * el sufijo de código en la misma operación.
   */
  async create(
    createPropertyDto: CreatePropertyDto,
    actor?: AuditActor,
  ): Promise<Property> {
    const neighborhood = await this.neighborhoodRepository.findOne({
      where: { id: createPropertyDto.neighborhoodId },
    });
    if (!neighborhood) throw new BadRequestException('Neighborhood not found');

    const sequenceRows = await this.propertyRepository.query<
      { value: string }[]
    >(`SELECT nextval('property_code_seq') AS value`);
    const code = formatPropertyCode(Number(sequenceRows[0].value));
    const slug = buildPropertySlug(createPropertyDto.title, code);

    const property = this.propertyRepository.create({
      operation: createPropertyDto.operation,
      type: createPropertyDto.type,
      title: createPropertyDto.title,
      description: createPropertyDto.description,
      neighborhood,
      address: createPropertyDto.address,
      showExactAddress: createPropertyDto.showExactAddress,
      currency: createPropertyDto.currency,
      price: createPropertyDto.price,
      expenses: createPropertyDto.expenses,
      rooms: createPropertyDto.rooms,
      bedrooms: createPropertyDto.bedrooms,
      bathrooms: createPropertyDto.bathrooms,
      hasGarage: createPropertyDto.hasGarage,
      coveredArea: createPropertyDto.coveredArea,
      totalArea: createPropertyDto.totalArea,
      age: createPropertyDto.age,
      creditEligible: createPropertyDto.creditEligible,
      petsAllowed: createPropertyDto.petsAllowed,
      immediateAvailability: createPropertyDto.immediateAvailability,
      marketingTag: createPropertyDto.marketingTag,
      featured: createPropertyDto.featured,
      hasWater: createPropertyDto.hasWater,
      hasNaturalGas: createPropertyDto.hasNaturalGas,
      hasSewer: createPropertyDto.hasSewer,
      hasElectricity: createPropertyDto.hasElectricity,
      hasInternet: createPropertyDto.hasInternet,
      code,
      slug,
      publicationStatus: PublicationStatus.DRAFT,
      dealStatus: DealStatus.AVAILABLE,
      firstPublishedAt: null,
    });

    const saved = await this.propertyRepository.save(property);

    await this.auditLogService.record({
      actor,
      action: AuditAction.PROPERTY_CREATED,
      entityType: 'property',
      entityId: saved.id,
      metadata: { code: saved.code, title: saved.title },
    });

    return saved;
  }

  /**
   * Actualiza campos editables. `code` y `slug` nunca se aceptan del DTO:
   * el `code` es inmutable y el `slug` solo se recalcula acá (antes del
   * primer publish) a partir del `title`. Si el set de cambios queda vacío
   * no hace save ni audita (evita ruido de auditoría).
   *
   * `neighborhoodId` se resuelve aparte con la misma regla que `create()`:
   * si viene y difiere del barrio actual, se busca por id; si no existe,
   * `BadRequestException('Neighborhood not found')` sin guardar ni auditar;
   * si existe, se reasigna la relación y `'neighborhoodId'` entra en
   * `changedFields`. Si coincide con el barrio actual, es un no-op para ese
   * campo (ni siquiera se consulta el repositorio de barrios).
   */
  async update(
    id: string,
    updatePropertyDto: UpdatePropertyDto,
    actor?: AuditActor,
  ): Promise<Property> {
    const property = await this.findOne(id);

    // Checked before mutating so a rejected request leaves no partial change.
    if (
      updatePropertyDto.operation !== undefined &&
      updatePropertyDto.operation !== property.operation &&
      !isDealStatusAllowedForOperation(
        updatePropertyDto.operation,
        property.dealStatus,
      )
    )
      throw new BadRequestException(
        `Cannot change operation to "${updatePropertyDto.operation}" while the property is "${property.dealStatus}"; set the deal status to available or reserved first`,
      );

    const dtoRecord = updatePropertyDto as unknown as Record<string, unknown>;
    const propertyRecord = property as unknown as Record<string, unknown>;
    const changedFields: string[] = [];
    for (const key of UPDATABLE_FIELDS) {
      const value = dtoRecord[key];
      if (value === undefined) continue;
      if (propertyRecord[key] !== value) {
        propertyRecord[key] = value;
        changedFields.push(key);
      }
    }

    if (
      updatePropertyDto.neighborhoodId !== undefined &&
      updatePropertyDto.neighborhoodId !== property.neighborhood.id
    ) {
      const neighborhood = await this.neighborhoodRepository.findOne({
        where: { id: updatePropertyDto.neighborhoodId },
      });
      if (!neighborhood)
        throw new BadRequestException('Neighborhood not found');
      property.neighborhood = neighborhood;
      changedFields.push('neighborhoodId');
    }

    if (changedFields.length === 0) return property;

    if (changedFields.includes('title') && property.firstPublishedAt === null)
      property.slug = buildPropertySlug(property.title, property.code);

    const saved = await this.propertyRepository.save(property);

    await this.auditLogService.record({
      actor,
      action: AuditAction.PROPERTY_UPDATED,
      entityType: 'property',
      entityId: saved.id,
      metadata: { code: saved.code, changedFields },
    });

    return saved;
  }

  /** Obtiene una propiedad por id (cualquier `publicationStatus`), con su barrio. */
  async findOne(id: string): Promise<Property> {
    const property = await this.propertyRepository.findOne({
      where: { id },
      relations: ['neighborhood'],
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  /**
   * Same lookup as `findOne`, plus the property's images ordered ascending
   * by `position`. Used only by the admin `GET /:id` endpoint —
   * `findOne()` itself stays unchanged (no images relation, no extra
   * query) since every mutation path calls it.
   */
  async findOneWithImages(
    id: string,
  ): Promise<Property & { images: PropertyImageResponse[] }> {
    const property = await this.findOne(id);
    const images = await this.propertyImagesRepository.findByPropertyId(id);

    return {
      ...property,
      images: images.map((image) =>
        toPropertyImageResponse(image, this.mediaUrlBuilder),
      ),
    };
  }

  /**
   * Lists properties for `GET /api/admin/properties` across every
   * `publicationStatus`, applying the `PropertyQuerySpec` produced by
   * `buildAdminPropertyQuery`. No status is forced (unlike the public
   * catalog): admins see every status unless they filter to one.
   */
  async findAll(
    filters: AdminPropertyFiltersDto,
  ): Promise<Paginated<Property>> {
    const spec = buildAdminPropertyQuery(filters);

    const queryBuilder = this.propertyRepository
      .createQueryBuilder(PROPERTY_ALIAS)
      .innerJoinAndSelect(`${PROPERTY_ALIAS}.neighborhood`, NEIGHBORHOOD_ALIAS);

    for (const clause of spec.where) {
      queryBuilder.andWhere(clause.sql, clause.params);
    }

    spec.orderBy.forEach((order, index) => {
      if (index === 0) queryBuilder.orderBy(order.column, order.direction);
      else queryBuilder.addOrderBy(order.column, order.direction);
    });

    queryBuilder.take(spec.take).skip(spec.skip);

    const [items, total] = await queryBuilder.getManyAndCount();
    return { items, total };
  }

  /**
   * Publishes a property (`draft`/`archived` -> `published`). `firstPublishedAt`
   * is set only on first publish (still null); a re-publish from `archived`
   * leaves it unchanged. Invalid transitions throw via
   * `assertPublicationTransition` before anything is saved or audited.
   */
  async publish(id: string, actor?: AuditActor): Promise<Property> {
    const property = await this.findOne(id);
    const from = property.publicationStatus;
    const to = assertPublicationTransition(from, 'publish');

    const firstPublish = property.firstPublishedAt === null;
    if (firstPublish) property.firstPublishedAt = new Date();
    property.publicationStatus = to;

    const saved = await this.propertyRepository.save(property);

    await this.auditLogService.record({
      actor,
      action: AuditAction.PROPERTY_PUBLISHED,
      entityType: 'property',
      entityId: saved.id,
      metadata: { code: saved.code, from, firstPublish },
    });

    return saved;
  }

  /**
   * Archives a property (`draft`/`published` -> `archived`), the soft
   * delete. `firstPublishedAt` is never touched.
   */
  async archive(id: string, actor?: AuditActor): Promise<Property> {
    const property = await this.findOne(id);
    const from = property.publicationStatus;
    const to = assertPublicationTransition(from, 'archive');

    property.publicationStatus = to;

    const saved = await this.propertyRepository.save(property);

    await this.auditLogService.record({
      actor,
      action: AuditAction.PROPERTY_ARCHIVED,
      entityType: 'property',
      entityId: saved.id,
      metadata: { code: saved.code, from },
    });

    return saved;
  }

  /**
   * Unpublishes a property back to `draft` (`published`/`archived` -> `draft`).
   * `firstPublishedAt` MUST NOT be cleared: it keeps the slug frozen and
   * hard-delete ineligible.
   */
  async unpublish(id: string, actor?: AuditActor): Promise<Property> {
    const property = await this.findOne(id);
    const from = property.publicationStatus;
    const to = assertPublicationTransition(from, 'unpublish');

    property.publicationStatus = to;

    const saved = await this.propertyRepository.save(property);

    await this.auditLogService.record({
      actor,
      action: AuditAction.PROPERTY_UNPUBLISHED,
      entityType: 'property',
      entityId: saved.id,
      metadata: { code: saved.code, from },
    });

    return saved;
  }

  /**
   * Sets `dealStatus`, independent of `publicationStatus`. Setting the
   * current value again, or a status incompatible with the property's
   * `operation` (`sold` on rent, `rented` on sale), is a 400 (no save, no
   * audit).
   */
  async updateDealStatus(
    id: string,
    dealStatus: DealStatus,
    actor?: AuditActor,
  ): Promise<Property> {
    const property = await this.findOne(id);
    const from = property.dealStatus;
    if (from === dealStatus)
      throw new BadRequestException(
        `Property already has dealStatus "${dealStatus}"`,
      );
    if (!isDealStatusAllowedForOperation(property.operation, dealStatus))
      throw new BadRequestException(
        `Deal status "${dealStatus}" is only allowed for ${
          dealStatus === DealStatus.SOLD ? Operation.SALE : Operation.RENT
        } properties`,
      );

    property.dealStatus = dealStatus;

    const saved = await this.propertyRepository.save(property);

    await this.auditLogService.record({
      actor,
      action: AuditAction.PROPERTY_DEAL_STATUS_CHANGED,
      entityType: 'property',
      entityId: saved.id,
      metadata: { code: saved.code, from, to: dealStatus },
    });

    return saved;
  }

  /**
   * Hard-deletes a property, allowed only when it was never published
   * (`firstPublishedAt IS NULL`). Guard access is method-level
   * (`@RoleProtected(admin)`) on the controller; this rule is the business
   * eligibility check.
   */
  async remove(id: string, actor?: AuditActor): Promise<void> {
    const property = await this.findOne(id);
    if (property.firstPublishedAt !== null)
      throw new BadRequestException(
        'Property was published at least once; archive it instead',
      );

    await this.propertyRepository.delete(id);

    await this.storagePort
      .deletePrefix(propertyMediaPrefix(id))
      .catch((err: unknown) => {
        this.logger.warn(
          `Failed to delete media prefix for property "${id}": ${(err as Error).message}`,
        );
      });

    await this.auditLogService.record({
      actor,
      action: AuditAction.PROPERTY_DELETED,
      entityType: 'property',
      entityId: property.id,
      metadata: { code: property.code, title: property.title },
    });
  }
}
