import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from '../leads/entities/lead.entity';
import { LeadStatus, LeadType } from '../leads/enums/lead.enums';
import { Property } from '../properties/entities/property.entity';
import { PublicationStatus } from '../properties/enums/property.enums';

const LATEST_LEADS = 5;

export interface DashboardSummary {
  leads: { new: number; total: number };
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
    const [newLeads, totalLeads, latest, statusRows, withoutImages] =
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
      ]);

    const byStatus = {
      [PublicationStatus.DRAFT]: 0,
      [PublicationStatus.PUBLISHED]: 0,
      [PublicationStatus.ARCHIVED]: 0,
    };
    for (const row of statusRows) byStatus[row.status] = Number(row.count);

    return {
      leads: { new: newLeads, total: totalLeads },
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
