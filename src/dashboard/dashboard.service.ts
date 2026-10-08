import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from '../leads/entities/lead.entity';
import {
  LeadCategory,
  LeadStatus,
  LeadTopic,
  LeadType,
} from '../leads/enums/lead.enums';
import { leadCategoryOf } from '../leads/helpers/lead-category';
import { Property } from '../properties/entities/property.entity';
import { PublicationStatus } from '../properties/enums/property.enums';

const LATEST_LEADS = 5;

export interface DashboardSummary {
  leads: {
    new: number;
    total: number;
    /** Leads with status `new`, grouped by the derived lead category. */
    newByCategory: Record<LeadCategory, number>;
  };
  properties: {
    draft: number;
    published: number;
    archived: number;
    publishedWithoutImages: number;
  };
  latestLeads: Array<{
    id: string;
    name: string;
    type: LeadType;
    status: LeadStatus;
    topic: LeadTopic | null;
    createdAt: Date;
    property: { id: string; code: string; title: string } | null;
  }>;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
  ) {}

  async getSummary(): Promise<DashboardSummary> {
    const [newLeads, totalLeads, latest, statusRows, withoutImages, newRows] =
      await Promise.all([
        this.leadRepository.count({ where: { status: LeadStatus.NEW } }),
        this.leadRepository.count(),
        this.leadRepository.find({
          relations: { property: true },
          order: { createdAt: 'DESC', id: 'DESC' },
          take: LATEST_LEADS,
        }),
        this.propertyRepository
          .createQueryBuilder('property')
          .select('property.publicationStatus', 'status')
          .addSelect('COUNT(*)', 'count')
          .groupBy('property.publicationStatus')
          .getRawMany<{ status: PublicationStatus; count: string }>(),
        this.propertyRepository
          .createQueryBuilder('property')
          .where('property.publicationStatus = :published', {
            published: PublicationStatus.PUBLISHED,
          })
          .andWhere(
            'NOT EXISTS (SELECT 1 FROM property_images pi WHERE pi.property_id = property.id)',
          )
          .getCount(),
        this.leadRepository
          .createQueryBuilder('lead')
          .select('lead.type', 'type')
          .addSelect('lead.topic', 'topic')
          .addSelect('COUNT(*)', 'count')
          .where('lead.status = :status', { status: LeadStatus.NEW })
          .groupBy('lead.type')
          .addGroupBy('lead.topic')
          .getRawMany<{
            type: LeadType;
            topic: LeadTopic | null;
            count: string;
          }>(),
      ]);

    const newByCategory = {
      [LeadCategory.APPRAISAL]: 0,
      [LeadCategory.SEARCH]: 0,
      [LeadCategory.MANAGEMENT]: 0,
      [LeadCategory.OTHER]: 0,
    };
    for (const row of newRows)
      newByCategory[leadCategoryOf(row.type, row.topic)] += Number(row.count);

    const byStatus = {
      [PublicationStatus.DRAFT]: 0,
      [PublicationStatus.PUBLISHED]: 0,
      [PublicationStatus.ARCHIVED]: 0,
    };
    for (const row of statusRows) byStatus[row.status] = Number(row.count);

    return {
      leads: { new: newLeads, total: totalLeads, newByCategory },
      properties: {
        draft: byStatus[PublicationStatus.DRAFT],
        published: byStatus[PublicationStatus.PUBLISHED],
        archived: byStatus[PublicationStatus.ARCHIVED],
        publishedWithoutImages: withoutImages,
      },
      latestLeads: latest.map((lead) => ({
        id: lead.id,
        name: lead.name,
        type: lead.type,
        status: lead.status,
        topic: lead.topic ?? null,
        createdAt: lead.createdAt,
        property: lead.property
          ? {
              id: lead.property.id,
              code: lead.property.code,
              title: lead.property.title,
            }
          : null,
      })),
    };
  }
}
