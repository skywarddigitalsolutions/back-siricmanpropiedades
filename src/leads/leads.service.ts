import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './entities/lead.entity';
import { LeadStatus } from './enums/lead.enums';
import { CreateLeadDto } from './dto/create-lead.dto';
import { AdminLeadFiltersDto, UpdateLeadDto } from './dto/admin-lead.dto';
import { AdminLeadResponse, toAdminLead } from './lead.mapper';
import { buildLeadWhere, LEAD_ALIAS } from './helpers/lead-query.builder';
import { Property } from '../properties/entities/property.entity';
import { PublicationStatus } from '../properties/enums/property.enums';
import { Paginated } from '../common/interfaces/paginated.interface';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { AuditActor } from '../audit/interfaces/audit-actor.interface';

const DEFAULT_LIMIT = 20;

/** Admin inbox page plus how many leads each status holds (see `findAll`). */
export type AdminLeadList = Paginated<AdminLeadResponse> & {
  counts: Record<LeadStatus, number>;
};

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Registra una consulta del sitio público. Si el honeypot vino completo
   * devuelve `null` sin guardar (el controller responde igual que un éxito,
   * para que un bot no aprenda nada). Una consulta por propiedad exige que la
   * propiedad esté publicada.
   */
  async submit(dto: CreateLeadDto): Promise<Lead | null> {
    if (dto.website) return null;

    let property: Property | null = null;
    if (dto.propertyId) {
      property = await this.propertyRepository.findOne({
        where: {
          id: dto.propertyId,
          publicationStatus: PublicationStatus.PUBLISHED,
        },
      });
      if (!property) throw new BadRequestException('Property not found');
    }

    const lead = this.leadRepository.create({
      type: dto.type,
      status: LeadStatus.NEW,
      name: dto.name,
      phone: dto.phone ?? null,
      email: dto.email?.trim().toLowerCase() ?? null,
      message: dto.message || null,
      topic: dto.topic ?? null,
      details: dto.details ?? null,
      property,
    });
    return this.leadRepository.save(lead);
  }

  /**
   * Bandeja de consultas: filtrable, paginada, más recientes primero. Incluye
   * `counts` por estado con todos los filtros menos el estado, para las
   * pestañas de la bandeja.
   */
  async findAll(filters: AdminLeadFiltersDto): Promise<AdminLeadList> {
    const listQuery = this.leadRepository
      .createQueryBuilder(LEAD_ALIAS)
      .leftJoinAndSelect(`${LEAD_ALIAS}.property`, 'property');
    for (const clause of buildLeadWhere(filters)) {
      listQuery.andWhere(clause.sql, clause.params);
    }
    listQuery
      .orderBy(`${LEAD_ALIAS}.createdAt`, 'DESC')
      .addOrderBy(`${LEAD_ALIAS}.id`, 'DESC')
      .take(filters.limit ?? DEFAULT_LIMIT)
      .skip(filters.offset ?? 0);
    const [rows, total] = await listQuery.getManyAndCount();

    const countQuery = this.leadRepository
      .createQueryBuilder(LEAD_ALIAS)
      .select(`${LEAD_ALIAS}.status`, 'status')
      .addSelect('COUNT(*)', 'count');
    for (const clause of buildLeadWhere(filters, { includeStatus: false })) {
      countQuery.andWhere(clause.sql, clause.params);
    }
    const countRows = await countQuery
      .groupBy(`${LEAD_ALIAS}.status`)
      .getRawMany<{ status: LeadStatus; count: string }>();

    const counts = {
      [LeadStatus.NEW]: 0,
      [LeadStatus.CONTACTED]: 0,
      [LeadStatus.CLOSED]: 0,
    };
    for (const row of countRows) counts[row.status] = Number(row.count);

    return { items: rows.map(toAdminLead), total, counts };
  }

  async findOne(id: string): Promise<AdminLeadResponse> {
    return toAdminLead(await this.findEntity(id));
  }

  /** Cambia el estado y/o las notas internas; audita qué cambió. */
  async update(
    id: string,
    dto: UpdateLeadDto,
    actor?: AuditActor,
  ): Promise<AdminLeadResponse> {
    const lead = await this.findEntity(id);
    const changedFields: string[] = [];

    if (dto.status !== undefined && dto.status !== lead.status) {
      lead.status = dto.status;
      changedFields.push('status');
    }
    if (dto.notes !== undefined) {
      const notes = dto.notes || null;
      if (notes !== lead.notes) {
        lead.notes = notes;
        changedFields.push('notes');
      }
    }
    if (changedFields.length === 0)
      throw new BadRequestException('Nothing to update');

    const saved = await this.leadRepository.save(lead);
    await this.auditLogService.record({
      actor,
      action: AuditAction.LEAD_UPDATED,
      entityType: 'lead',
      entityId: lead.id,
      metadata: { changedFields, status: saved.status },
    });
    return toAdminLead(saved);
  }

  /** Borrado definitivo (limpieza de spam); solo admin, ver el controller. */
  async remove(id: string, actor?: AuditActor): Promise<void> {
    const lead = await this.findEntity(id);
    await this.leadRepository.remove(lead);
    await this.auditLogService.record({
      actor,
      action: AuditAction.LEAD_DELETED,
      entityType: 'lead',
      entityId: id,
      metadata: { type: lead.type },
    });
  }

  private async findEntity(id: string): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id },
      relations: { property: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }
}
