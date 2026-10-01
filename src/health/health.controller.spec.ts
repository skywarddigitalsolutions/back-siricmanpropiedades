import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { META_ROLES } from '../auth/helpers/meta-helpers';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('is public (no role metadata, no guards)', () => {
    expect(Reflect.getMetadata(META_ROLES, HealthController)).toBeUndefined();
    expect(Reflect.getMetadata('__guards__', HealthController)).toBeUndefined();
  });

  it('answers { status: "ok" } when SELECT 1 succeeds', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const controller = new HealthController(dataSource as any);

    await expect(controller.check()).resolves.toEqual({ status: 'ok' });
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('answers 503 without leaking details when the query fails', async () => {
    const dataSource = {
      query: jest.fn().mockRejectedValue(new Error('password for db_user')),
    };
    const controller = new HealthController(dataSource as any);

    const error = await controller.check().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    const exception = error as ServiceUnavailableException;
    expect(exception.getStatus()).toBe(503);
    expect(exception.getResponse()).toMatchObject({ status: 'error' });
    expect(JSON.stringify(exception.getResponse())).not.toContain('password');
  });
});
