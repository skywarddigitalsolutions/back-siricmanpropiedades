import { ValidationPipe } from '@nestjs/common';
import { AdminPropertyFiltersDto } from './admin-property-filters.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const asQuery = { type: 'query' as const, metatype: AdminPropertyFiltersDto };

describe('AdminPropertyFiltersDto', () => {
  it('accepts sort, order, currency and a boolean hasImages from the query string', async () => {
    const dto = (await pipe.transform(
      { sort: 'price', order: 'asc', currency: 'USD', hasImages: 'false' },
      asQuery,
    )) as AdminPropertyFiltersDto;

    expect(dto).toMatchObject({
      sort: 'price',
      order: 'asc',
      currency: 'USD',
      hasImages: false,
    });
  });

  it('rejects price sorting without currency', async () => {
    await expect(pipe.transform({ sort: 'price' }, asQuery)).rejects.toThrow();
  });

  it.each([{ sort: 'title' }, { order: 'sideways' }, { hasImages: 'maybe' }])(
    'rejects %j',
    async (query) => {
      await expect(pipe.transform(query, asQuery)).rejects.toThrow();
    },
  );
});
