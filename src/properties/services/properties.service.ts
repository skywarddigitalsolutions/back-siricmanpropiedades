import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from '../entities/property.entity';
import { Neighborhood } from '../../neighborhoods/entities/neighborhood.entity';
import { CreatePropertyDto, UpdatePropertyDto } from '../dto';
import {
  buildPropertySlug,
  formatPropertyCode,
} from '../helpers/property-identifiers';
import { PublicationStatus, DealStatus } from '../enums/property.enums';
import { AuditLogService } from '../../audit/audit-log.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { AuditActor } from '../../audit/interfaces/audit-actor.interface';

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
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(Neighborhood)
    private readonly neighborhoodRepository: Repository<Neighborhood>,
    private readonly auditLogService: AuditLogService,
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
}
