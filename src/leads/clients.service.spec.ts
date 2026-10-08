import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClientsService } from './clients.service';
import { Lead } from './entities/lead.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditAction } from '../audit/enums/audit-action.enum';

const ACTOR = { id: 'user-1', userName: 'gabriel' };

describe('ClientsService', () => {
  let service: ClientsService;
  let leadRepository: { query: jest.Mock };
  let auditLogService: { record: jest.Mock };

  beforeEach(async () => {
    leadRepository = { query: jest.fn() };
    auditLogService = { record: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: getRepositoryToken(Lead), useValue: leadRepository },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();
    service = module.get(ClientsService);
  });

  const row = (overrides = {}) => ({
    email: 'juan@x.com',
    name: 'Juan',
    phone: null,
    inquiries: 2,
    firstInquiryAt: new Date('2026-09-01T10:00:00Z'),
    lastInquiryAt: new Date('2026-09-30T10:00:00Z'),
    ...overrides,
  });

  describe('findAll', () => {
    it('groups by lower(email), binds every value and defaults the page', async () => {
      leadRepository.query
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce([row()])
        .mockResolvedValueOnce([]);

      const result = await service.findAll({});

      const [countSql, countParams] = leadRepository.query.mock.calls[0];
      expect(countSql).toContain('count(DISTINCT lower(l.email))');
      expect(countParams).toEqual([]);
      const [pageSql, pageParams] = leadRepository.query.mock.calls[1];
      expect(pageSql).toContain('GROUP BY lower(l.email)');
      expect(pageSql).toContain('ORDER BY max(l.created_at) DESC');
      expect(pageSql).toContain('LIMIT $1 OFFSET $2');
      expect(pageParams).toEqual([20, 0]);
      expect(result.total).toBe(1);
      expect(result.items[0]).toMatchObject({
        email: 'juan@x.com',
        inquiries: 2,
        properties: [],
      });
    });

    it('escapes LIKE wildcards in q and passes it as a parameter', async () => {
      leadRepository.query
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);

      await service.findAll({ q: ' 50%_off ', limit: 10, offset: 5 });

      const [countSql, countParams] = leadRepository.query.mock.calls[0];
      expect(countSql).toContain('ILIKE $1');
      expect(countSql).not.toContain('50%');
      expect(countParams).toEqual(['%50\\%\\_off%']);
      const [, pageParams] = leadRepository.query.mock.calls[1];
      expect(pageParams).toEqual(['%50\\%\\_off%', 10, 5]);
    });

    it('attaches the distinct properties (latest first, at most 5) to each client', async () => {
      leadRepository.query
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce([row()])
        .mockResolvedValueOnce(
          ['a', 'b', 'c', 'd', 'e', 'f'].map((k) => ({
            email: 'juan@x.com',
            id: `id-${k}`,
            code: `SP-${k}`,
            title: `Casa ${k}`,
          })),
        );

      const { items } = await service.findAll({});

      const [propsSql, propsParams] = leadRepository.query.mock.calls[2];
      expect(propsSql).toContain('= ANY($1)');
      expect(propsParams).toEqual([['juan@x.com']]);
      expect(items[0].properties.map((p) => p.code)).toEqual([
        'SP-a',
        'SP-b',
        'SP-c',
        'SP-d',
        'SP-e',
      ]);
      expect(items[0].properties[0]).toEqual({
        id: 'id-a',
        code: 'SP-a',
        title: 'Casa a',
      });
    });
  });

  describe('exportCsv', () => {
    it('leaves empty cells for a client without phone or properties', async () => {
      leadRepository.query
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce([row()])
        .mockResolvedValueOnce([]);

      const csv = await service.exportCsv({}, ACTOR);

      expect(csv.split('\r\n')[1]).toBe(
        'juan@x.com;Juan;;2;01/09/2026 07:00;30/09/2026 07:00;',
      );
    });

    it('returns one row per client with a BOM and audits the export', async () => {
      leadRepository.query
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce([
          row({ name: '=HYPERLINK("x")', phone: '+54 9' }),
        ])
        .mockResolvedValueOnce([
          { email: 'juan@x.com', id: 'p1', code: 'SP-0001', title: 'Casa' },
          { email: 'juan@x.com', id: 'p2', code: 'SP-0002', title: 'PH' },
        ]);

      const csv = await service.exportCsv({ q: 'juan' }, ACTOR);

      expect(csv.startsWith('\uFEFF')).toBe(true);
      const lines = csv.slice(1).split('\r\n');
      expect(lines.pop()).toBe('');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe(
        'Email;Nombre;Teléfono;Consultas;Primera consulta;Última consulta;Propiedades',
      );
      expect(lines[1]).toBe(
        'juan@x.com;"\'=HYPERLINK(""x"")";\'+54 9;2;01/09/2026 07:00;30/09/2026 07:00;SP-0001, SP-0002',
      );
      expect(auditLogService.record).toHaveBeenCalledWith({
        actor: ACTOR,
        action: AuditAction.CLIENTS_EXPORTED,
        entityType: 'client',
        metadata: { rows: 1, q: 'juan' },
      });
    });
  });
});
