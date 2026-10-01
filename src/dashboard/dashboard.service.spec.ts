import { DashboardService } from './dashboard.service';
import { LeadStatus, LeadType } from '../leads/enums/lead.enums';

function qb(raw: unknown) {
  const q: any = {};
  for (const m of ['select', 'addSelect', 'andWhere', 'where', 'groupBy'])
    q[m] = jest.fn(() => q);
  q.getRawMany = jest.fn(async () => raw);
  q.getCount = jest.fn(async () => raw);
  return q;
}

describe('DashboardService', () => {
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
          createdAt: new Date('2026-09-30T10:00:00Z'),
          property: null,
        },
      ]),
    };
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
    expect(noImagesQb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('NOT EXISTS'),
    );
    expect(result).toEqual({
      leads: { new: 3, total: 10 },
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
          createdAt: new Date('2026-10-01T10:00:00Z'),
          property: { id: 'p1', code: 'SP-1', title: 'Casa' },
        },
        {
          id: 'l2',
          name: 'Beto',
          type: LeadType.APPRAISAL,
          status: LeadStatus.CLOSED,
          createdAt: new Date('2026-09-30T10:00:00Z'),
          property: null,
        },
      ],
    });
  });
});
