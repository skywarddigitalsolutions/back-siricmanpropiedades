import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { RetentionService } from './retention.service';
import { RevokedToken } from '../auth/entities/revoked-token.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

describe('RetentionService', () => {
  let service: RetentionService;
  let revokedTokenRepository: any;
  let auditLogRepository: any;

  beforeEach(async () => {
    revokedTokenRepository = {
      delete: jest.fn().mockResolvedValue({ affected: 3 }),
    };
    auditLogRepository = {
      delete: jest.fn().mockResolvedValue({ affected: 7 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetentionService,
        {
          provide: getRepositoryToken(RevokedToken),
          useValue: revokedTokenRepository,
        },
        { provide: getRepositoryToken(AuditLog), useValue: auditLogRepository },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('30') },
        },
      ],
    }).compile();

    service = module.get(RetentionService);
  });

  it('purges revoked tokens whose expiration date has already passed', async () => {
    await service.purgeExpiredRevokedTokens();

    expect(revokedTokenRepository.delete).toHaveBeenCalledWith(
      expect.objectContaining({ expiresAt: expect.anything() }),
    );
  });

  it('purges audit logs older than the configured retention window', async () => {
    await service.purgeOldAuditLogs();

    expect(auditLogRepository.delete).toHaveBeenCalledWith(
      expect.objectContaining({ createdAt: expect.anything() }),
    );
  });
});
