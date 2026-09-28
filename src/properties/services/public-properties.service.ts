import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from '../entities/property.entity';
import { PublicPropertyFiltersDto } from '../dto';
import {
  buildPublicPropertyQuery,
  NEIGHBORHOOD_ALIAS,
  PROPERTY_ALIAS,
} from '../helpers/property-query.builder';
import {
  PublicPropertyResponse,
  toPublicProperty,
} from '../helpers/public-property.mapper';
import { PublicationStatus } from '../enums/property.enums';
import { Paginated } from '../../common/interfaces/paginated.interface';

/**
 * Read-only public catalog (`GET /api/properties`, `GET /api/properties/:slug`).
 * Restricted to `publicationStatus = 'published'` by the query itself (see
 * `buildPublicPropertyQuery` and the `findBySlug` `where` clause below), so
 * no combination of filters or slugs can ever surface a `draft`/`archived`
 * property — matching `specs/property-public-catalog/spec.md`'s Public
 * Listing Scope and Public Property Detail by Slug requirements.
 */
@Injectable()
export class PublicPropertiesService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
  ) {}

  async findAll(
    filters: PublicPropertyFiltersDto,
  ): Promise<Paginated<PublicPropertyResponse>> {
    const spec = buildPublicPropertyQuery(filters);

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

    const [rows, total] = await queryBuilder.getManyAndCount();
    return { items: rows.map(toPublicProperty), total };
  }

  /**
   * A slug that does not exist, or resolves to a `draft`/`archived`
   * property, is indistinguishable from the caller's point of view: both
   * cases hit the same `where` clause and both return 404. This avoids
   * leaking whether a non-published property exists at all.
   */
  async findBySlug(slug: string): Promise<PublicPropertyResponse> {
    const property = await this.propertyRepository.findOne({
      where: { slug, publicationStatus: PublicationStatus.PUBLISHED },
      relations: ['neighborhood'],
    });
    if (!property) throw new NotFoundException('Property not found');
    return toPublicProperty(property);
  }
}
