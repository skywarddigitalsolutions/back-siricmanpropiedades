import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Neighborhood } from './entities/neighborhood.entity';
import { CreateNeighborhoodDto } from './dto';
import { slugify } from '../common/utils/slugify';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { AuditActor } from '../audit/interfaces/audit-actor.interface';

/** Postgres unique_violation error code. */
const UNIQUE_VIOLATION_CODE = '23505';

@Injectable()
export class NeighborhoodsService {
  constructor(
    @InjectRepository(Neighborhood)
    private readonly neighborhoodRepository: Repository<Neighborhood>,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Listar todos los barrios ordenados por nombre.
   */
  async findAll(): Promise<Neighborhood[]> {
    return this.neighborhoodRepository.find({ order: { name: 'ASC' } });
  }

  /**
   * Crear un nuevo barrio. La unicidad se valida por slug (normaliza
   * acentos/mayúsculas), y una violación 23505 en una carrera se mapea al
   * mismo 400.
   */
  async create(
    createNeighborhoodDto: CreateNeighborhoodDto,
    actor?: AuditActor,
  ): Promise<Neighborhood> {
    const { name } = createNeighborhoodDto;
    const slug = slugify(name);

    const existing = await this.neighborhoodRepository.findOne({
      where: { slug },
    });
    if (existing)
      throw new BadRequestException(`Neighborhood "${name}" already exists`);

    const neighborhood = this.neighborhoodRepository.create({ name, slug });

    let saved: Neighborhood;
    try {
      saved = await this.neighborhoodRepository.save(neighborhood);
    } catch (error) {
      if (this.isUniqueViolation(error))
        throw new BadRequestException(`Neighborhood "${name}" already exists`);
      throw error;
    }

    await this.auditLogService.record({
      actor,
      action: AuditAction.NEIGHBORHOOD_CREATED,
      entityType: 'neighborhood',
      entityId: saved.id,
      metadata: { name: saved.name, slug: saved.slug },
    });

    return saved;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === UNIQUE_VIOLATION_CODE
    );
  }
}
