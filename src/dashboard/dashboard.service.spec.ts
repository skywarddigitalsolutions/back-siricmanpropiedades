import { DashboardService } from './dashboard.service';
import { LeadStatus, LeadTopic, LeadType } from '../leads/enums/lead.enums';

function qb(raw: unknown) {
  const q: any = {};
  for (const m of [
    'select',
    'addSelect',
    'andWhere',
    'where',
    'groupBy',
    'addGroupBy',
  ])
    q[m] = jest.fn(() => q);
  q.getRawMany = jest.fn(async () => raw);
  q.getCount = jest.fn(async () => raw);
  return q;
}

describe('DashboardService', () => {
  const newByTypeTopic = [
    { type: 'appraisal', topic: 'sell', count: '2' },
    { type: 'property_inquiry', topic: null, count: '1' },
    { type: 'contact', topic: 'buy', count: '3' },
    { type: 'contact', topic: 'rental_management', count: '4' },
    { type: 'contact', topic: null, count: '5' },
    { type: 'contact', topic: 'other', count: '1' },
  ];

  it('summarizes leads and properties and lists the 5 latest leads minimally', async () => {
    const leadRepository: any = {
      count: jest
        .fn()
        .mockResolvedValueOnce(3) // new
        .mockResolvedValueOnce(10), // total
      find: jest.fn().mockResolvedValue([
        {
          id: 'l1',
          name: 'Ana',
          type: LeadType.CONTACT,
          status: LeadStatus.NEW,
          topic: LeadTopic.BUY,
          email: 'a@x.com',
          message: 'secret body',
          createdAt: new Date('2026-10-01T10:00:00Z'),
          property: { id: 'p1', code: 'SP-1', title: 'Casa', slug: 's' },
        },
        {
          id: 'l2',
          name: 'Beto',
          type: LeadType.APPRAISAL,
          status: LeadStatus.CLOSED,
          topic: null,
          createdAt: new Date('2026-09-30T10:00:00Z'),
          property: null,
        },
      ]),
    };
    const leadsQb = qb(newByTypeTopic);
    leadRepository.createQueryBuilder = jest.fn(() => leadsQb);
    const statusQb = qb([
      { status: 'draft', count: '2' },
      { status: 'published', count: '7' },
    ]);
    const noImagesQb = qb(4);
    const propertyRepository: any = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(statusQb)
        .mockReturnValueOnce(noImagesQb),
    };
    const service = new DashboardService(leadRepository, propertyRepository);

    const result = await service.getSummary();

    expect(leadRepository.count).toHaveBeenCalledWith({
      where: { status: LeadStatus.NEW },
    });
    expect(leadRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5,
        order: { createdAt: 'DESC', id: 'DESC' },
        relations: { property: true },
      }),
    );
    expect(leadsQb.where).toHaveBeenCalledWith('lead.status = :status', {
      status: LeadStatus.NEW,
    });
    expect(noImagesQb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('NOT EXISTS'),
    );
    expect(result).toEqual({
      leads: {
        new: 3,
        total: 10,
        newByCategory: { appraisal: 2, search: 4, management: 4, other: 6 },
      },
      properties: {
        draft: 2,
        published: 7,
        archived: 0,
        publishedWithoutImages: 4,
      },
      latestLeads: [
        {
          id: 'l1',
          name: 'Ana',
          type: LeadType.CONTACT,
          status: LeadStatus.NEW,
          topic: LeadTopic.BUY,
          createdAt: new Date('2026-10-01T10:00:00Z'),
          property: { id: 'p1', code: 'SP-1', title: 'Casa' },
        },
        {
          id: 'l2',
          name: 'Beto',
          type: LeadType.APPRAISAL,
          status: LeadStatus.CLOSED,
          topic: null,
          createdAt: new Date('2026-09-30T10:00:00Z'),
          property: null,
        },
      ],
    });
  });
});
