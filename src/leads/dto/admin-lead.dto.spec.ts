import { ValidationPipe } from '@nestjs/common';
import { AdminLeadFiltersDto } from './admin-lead.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const asQuery = { type: 'query' as const, metatype: AdminLeadFiltersDto };

describe('AdminLeadFiltersDto', () => {
  it('accepts q and a UUID propertyId, trimming q', async () => {
    const dto = (await pipe.transform(
      { q: '  ana ', propertyId: '8f8e2c0e-4a8a-4f43-9a51-2a3c5f9c2b11' },
      asQuery,
    )) as AdminLeadFiltersDto;

    expect(dto.q).toBe('ana');
    expect(dto.propertyId).toBe('8f8e2c0e-4a8a-4f43-9a51-2a3c5f9c2b11');
  });

  it('rejects a propertyId that is not a UUID', async () => {
    await expect(
      pipe.transform({ propertyId: 'nope' }, asQuery),
    ).rejects.toThrow();
  });

  it('rejects an overlong q', async () => {
    await expect(
      pipe.transform({ q: 'a'.repeat(101) }, asQuery),
    ).rejects.toThrow();
  });
});
