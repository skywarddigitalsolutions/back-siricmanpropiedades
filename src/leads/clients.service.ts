import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './entities/lead.entity';
import {
  AdminClientExportDto,
  AdminClientFiltersDto,
} from './dto/admin-client.dto';
import { toCsv } from './helpers/csv';
import { Paginated } from '../common/interfaces/paginated.interface';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { AuditActor } from '../audit/interfaces/audit-actor.interface';

const DEFAULT_LIMIT = 20;
const MAX_PROPERTIES_PER_CLIENT = 5;
/** Safety cap for the CSV export; a small agency is nowhere near it. */
const EXPORT_MAX_ROWS = 10_000;

export interface ClientProperty {
  id: string;
  code: string;
  title: string;
}

export interface ClientSummary {
  email: string;
  name: string;
  phone: string | null;
  inquiries: number;
  firstInquiryAt: Date;
  lastInquiryAt: Date;
  properties: ClientProperty[];
}

type ClientRow = Omit<ClientSummary, 'properties'>;

/** Escapes `\`, `%` and `_` so a caller-supplied value is literal inside ILIKE. */
function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Clients are a derived view over leads: every lead with an email, grouped by
 * `lower(email)`. A search keeps a client when ANY of its leads matches, but
 * the aggregates still cover all of the client's leads. All values are bound
 * parameters; ORDER BY is fixed.
 */
@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    private readonly auditLogService: AuditLogService,
  ) {}

  findAll(filters: AdminClientFiltersDto): Promise<Paginated<ClientSummary>> {
    return this.query(
      filters.q,
      filters.limit ?? DEFAULT_LIMIT,
      filters.offset ?? 0,
    );
  }

  /** CSV with one row per client; audited because it exports personal data. */
  async exportCsv(
    filters: AdminClientExportDto,
    actor?: AuditActor,
  ): Promise<string> {
    const { items } = await this.query(filters.q, EXPORT_MAX_ROWS, 0);
    await this.auditLogService.record({
      actor,
      action: AuditAction.CLIENTS_EXPORTED,
      entityType: 'client',
      metadata: { rows: items.length, q: filters.q ?? null },
    });
    return toCsv(
      [
        'email',
        'name',
        'phone',
        'inquiries',
        'firstInquiryAt',
        'lastInquiryAt',
        'properties',
      ],
      items.map((c) => [
        c.email,
        c.name,
        c.phone,
        c.inquiries,
        c.firstInquiryAt,
        c.lastInquiryAt,
        c.properties.map((p) => p.code).join('; '),
      ]),
    );
  }

  private run<T>(sql: string, params: unknown[]): Promise<T> {
    return this.leadRepository.query(sql, params);
  }

  private async query(
    q: string | undefined,
    limit: number,
    offset: number,
  ): Promise<Paginated<ClientSummary>> {
    const params: unknown[] = [];
    let match = '';
    const term = q?.trim();
    if (term) {
      params.push(`%${escapeLikePattern(term)}%`);
      match = `AND lower(l.email) IN (
        SELECT lower(m.email) FROM leads m
        WHERE m.email IS NOT NULL
          AND (m.email ILIKE $1 OR m.name ILIKE $1 OR m.phone ILIKE $1)
      )`;
    }

    const [{ total }] = await this.run<Array<{ total: number }>>(
      `SELECT count(DISTINCT lower(l.email))::int AS total
       FROM leads l WHERE l.email IS NOT NULL ${match}`,
      params,
    );

    const limitIdx = params.length + 1;
    const rows = await this.run<ClientRow[]>(
      `SELECT lower(l.email) AS email,
              (array_agg(l.name ORDER BY l.created_at DESC, l.id DESC))[1] AS name,
              (array_agg(l.phone ORDER BY l.created_at DESC, l.id DESC)
                 FILTER (WHERE l.phone IS NOT NULL))[1] AS phone,
              count(*)::int AS inquiries,
              min(l.created_at) AS "firstInquiryAt",
              max(l.created_at) AS "lastInquiryAt"
       FROM leads l
       WHERE l.email IS NOT NULL ${match}
       GROUP BY lower(l.email)
       ORDER BY max(l.created_at) DESC, lower(l.email) ASC
       LIMIT $${limitIdx} OFFSET $${limitIdx + 1}`,
      [...params, limit, offset],
    );

    const byEmail = new Map<string, ClientProperty[]>();
    if (rows.length > 0) {
      const props: Array<ClientProperty & { email: string }> = await this.run(
        `SELECT lower(l.email) AS email, p.id, p.code, p.title
           FROM leads l JOIN properties p ON p.id = l.property_id
           WHERE lower(l.email) = ANY($1)
           GROUP BY lower(l.email), p.id, p.code, p.title
           ORDER BY max(l.created_at) DESC, p.id`,
        [rows.map((r) => r.email)],
      );
      for (const { email, id, code, title } of props) {
        const list = byEmail.get(email) ?? [];
        if (list.length < MAX_PROPERTIES_PER_CLIENT)
          list.push({ id, code, title });
        byEmail.set(email, list);
      }
    }

    return {
      items: rows.map((r) => ({
        ...r,
        properties: byEmail.get(r.email) ?? [],
      })),
      total,
    };
  }
}
