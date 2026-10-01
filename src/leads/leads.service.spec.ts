import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { Lead } from './entities/lead.entity';
import { LeadStatus, LeadTopic, LeadType } from './enums/lead.enums';
import { Property } from '../properties/entities/property.entity';
import { PublicationStatus } from '../properties/enums/property.enums';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { CreateLeadDto } from './dto/create-lead.dto';

const PROPERTY_ID = '8f8e2c0e-4a8a-4f43-9a51-2a3c5f9c2b11';
const ACTOR = { id: 'user-1', userName: 'gabriel' };

function inquiry(overrides: Partial<CreateLeadDto> = {}): CreateLeadDto {
  return {
    type: LeadType.PROPERTY_INQUIRY,
    propertyId: PROPERTY_ID,
    name: 'Ana García',
    phone: '+54 9 11 3896-7363',
    message: 'Me interesa',
    ...overrides,
  };
}

function storedLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-1',
    type: LeadType.PROPERTY_INQUIRY,
    status: LeadStatus.NEW,
    name: 'Ana García',
    phone: '+54 9 11 3896-7363',
    email: null,
    message: 'Me interesa',
    topic: null,
    details: null,
    notes: null,
    property: {
      id: PROPERTY_ID,
      code: 'SP-0001',
      title: 'Casa en Palermo',
      slug: 'casa-en-palermo',
    } as Property,
    createdAt: new Date('2026-09-30T12:00:00Z'),
    updatedAt: new Date('2026-09-30T12:00:00Z'),
    ...overrides,
  };
}

describe('LeadsService', () => {
  let service: LeadsService;
  let leadRepository: any;
  let propertyRepository: any;
  let auditLogService: any;

  beforeEach(async () => {
    leadRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(async (lead) => ({ id: 'lead-1', ...lead })),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    propertyRepository = { findOne: jest.fn() };
    auditLogService = { record: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: getRepositoryToken(Lead), useValue: leadRepository },
        { provide: getRepositoryToken(Property), useValue: propertyRepository },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(LeadsService);
  });

  describe('submit', () => {
    it('drops bot submissions that filled the honeypot without saving', async () => {
      const result = await service.submit(
        inquiry({ website: 'http://spam.example' }),
      );

      expect(result).toBeNull();
      expect(leadRepository.save).not.toHaveBeenCalled();
      expect(propertyRepository.findOne).not.toHaveBeenCalled();
    });

    it('rejects an inquiry about a property that is not published', async () => {
      propertyRepository.findOne.mockResolvedValue(null);

      await expect(service.submit(inquiry())).rejects.toThrow(
        BadRequestException,
      );
      expect(propertyRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: PROPERTY_ID,
          publicationStatus: PublicationStatus.PUBLISHED,
        },
      });
    });

    it('saves an inquiry as new, linked to its property', async () => {
      const property = { id: PROPERTY_ID } as Property;
      propertyRepository.findOne.mockResolvedValue(property);

      const saved = await service.submit(inquiry({ website: '' }));

      expect(leadRepository.create).toHaveBeenCalledWith({
        type: LeadType.PROPERTY_INQUIRY,
        status: LeadStatus.NEW,
        name: 'Ana García',
        phone: '+54 9 11 3896-7363',
        email: null,
        message: 'Me interesa',
        topic: null,
        details: null,
        property,
      });
      expect(saved?.id).toBe('lead-1');
    });

    it('saves a contact message without a property', async () => {
      await service.submit(
        inquiry({
          type: LeadType.CONTACT,
          propertyId: undefined,
          phone: undefined,
          email: 'ana@mail.com',
          topic: LeadTopic.SELL,
        }),
      );

      expect(propertyRepository.findOne).not.toHaveBeenCalled();
      expect(leadRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          property: null,
          phone: null,
          email: 'ana@mail.com',
          topic: LeadTopic.SELL,
        }),
      );
    });
  });

  describe('findAll', () => {
    it('filters, paginates newest first and summarizes the property', async () => {
      leadRepository.findAndCount.mockResolvedValue([[storedLead()], 1]);

      const result = await service.findAll({
        status: LeadStatus.NEW,
        limit: 10,
        offset: 20,
      });

      expect(leadRepository.findAndCount).toHaveBeenCalledWith({
        where: { status: LeadStatus.NEW },
        relations: { property: true },
        order: { createdAt: 'DESC', id: 'DESC' },
        take: 10,
        skip: 20,
      });
      expect(result.total).toBe(1);
      expect(result.items[0].property).toEqual({
        id: PROPERTY_ID,
        code: 'SP-0001',
        title: 'Casa en Palermo',
        slug: 'casa-en-palermo',
      });
    });

    it('defaults to 20 per page from the start', async () => {
      leadRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({});

      expect(leadRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, take: 20, skip: 0 }),
      );
    });
  });

  describe('findOne', () => {
    it('throws 404 for an unknown lead', async () => {
      leadRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('changes status and notes and audits the change', async () => {
      leadRepository.findOne.mockResolvedValue(storedLead());

      const updated = await service.update(
        'lead-1',
        {
          status: LeadStatus.CONTACTED,
          notes: 'Llamé, vuelve a llamar el lunes',
        },
        ACTOR,
      );

      expect(updated.status).toBe(LeadStatus.CONTACTED);
      expect(updated.notes).toBe('Llamé, vuelve a llamar el lunes');
      expect(auditLogService.record).toHaveBeenCalledWith({
        actor: ACTOR,
        action: AuditAction.LEAD_UPDATED,
        entityType: 'lead',
        entityId: 'lead-1',
        metadata: {
          changedFields: ['status', 'notes'],
          status: LeadStatus.CONTACTED,
        },
      });
    });

    it('rejects an update that changes nothing', async () => {
      leadRepository.findOne.mockResolvedValue(storedLead());

      await expect(
        service.update('lead-1', { status: LeadStatus.NEW }, ACTOR),
      ).rejects.toThrow(BadRequestException);
      expect(leadRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the lead and audits it', async () => {
      const lead = storedLead();
      leadRepository.findOne.mockResolvedValue(lead);

      await service.remove('lead-1', ACTOR);

      expect(leadRepository.remove).toHaveBeenCalledWith(lead);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.LEAD_DELETED,
          entityId: 'lead-1',
        }),
      );
    });
  });
});
