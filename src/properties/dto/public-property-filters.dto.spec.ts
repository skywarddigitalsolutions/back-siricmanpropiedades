import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidationPipe } from '@nestjs/common';
import { PublicPropertyFiltersDto } from './public-property-filters.dto';
import { Currency, Operation, PropertyType } from '../enums/property.enums';

async function validateDto(payload: Record<string, unknown>) {
  const dto = plainToInstance(PublicPropertyFiltersDto, payload);
  const errors = await validate(dto);
  return { dto, errors };
}

describe('PublicPropertyFiltersDto', () => {
  it('accepts an empty filter set', async () => {
    const { errors } = await validateDto({});

    expect(errors).toHaveLength(0);
  });

  it('rejects an invalid operation value', async () => {
    const { errors } = await validateDto({ operation: 'alquiler' });

    expect(errors.some((error) => error.property === 'operation')).toBe(true);
  });

  it('rejects an invalid type value', async () => {
    const { errors } = await validateDto({ type: 'castillo' });

    expect(errors.some((error) => error.property === 'type')).toBe(true);
  });

  it('rejects an invalid sort value', async () => {
    const { errors } = await validateDto({ sort: 'cheapest' });

    expect(errors.some((error) => error.property === 'sort')).toBe(true);
  });

  it('rejects a non-numeric priceMin even when currency is set', async () => {
    const { errors } = await validateDto({
      priceMin: 'abc',
      currency: Currency.USD,
    });

    expect(errors.some((error) => error.property === 'priceMin')).toBe(true);
  });

  it('rejects priceMin without currency', async () => {
    const { errors } = await validateDto({ priceMin: '100' });

    expect(errors.some((error) => error.property === 'priceMin')).toBe(true);
  });

  it('rejects sort=price_asc without currency', async () => {
    const { errors } = await validateDto({ sort: 'price_asc' });

    expect(errors.some((error) => error.property === 'sort')).toBe(true);
  });

  it('accepts sort=price_asc with currency', async () => {
    const { errors } = await validateDto({
      sort: 'price_asc',
      currency: Currency.USD,
    });

    expect(errors).toHaveLength(0);
  });

  it.each([
    ['hasGarage', 'true', true],
    ['hasGarage', 'false', false],
    ['creditEligible', 'true', true],
    ['creditEligible', 'false', false],
    ['petsAllowed', 'true', true],
    ['petsAllowed', 'false', false],
  ])(
    'coerces %s=%s query string to boolean %s',
    async (field, raw, expected) => {
      const { dto, errors } = await validateDto({ [field]: raw });

      expect((dto as unknown as Record<string, unknown>)[field]).toBe(expected);
      expect(errors).toHaveLength(0);
    },
  );

  it('rejects a boolean toggle value other than the literal "true"/"false" strings', async () => {
    const { errors } = await validateDto({ hasGarage: 'yes' });

    expect(errors.some((error) => error.property === 'hasGarage')).toBe(true);
  });

  it.each([
    'minRooms',
    'minBedrooms',
    'minBathrooms',
    'minCoveredArea',
    'minTotalArea',
    'limit',
    'offset',
  ])('coerces %s from a query string to a number', async (field) => {
    const { dto, errors } = await validateDto({ [field]: '3' });

    expect(typeof (dto as unknown as Record<string, unknown>)[field]).toBe(
      'number',
    );
    expect(errors).toHaveLength(0);
  });

  it('coerces priceMin/priceMax query strings to numbers when currency is set', async () => {
    const { dto, errors } = await validateDto({
      priceMin: '50000',
      priceMax: '150000',
      currency: Currency.USD,
    });

    expect(typeof dto.priceMin).toBe('number');
    expect(typeof dto.priceMax).toBe('number');
    expect(errors).toHaveLength(0);
  });

  it('passes when no price filter, price sort, or currency is present', async () => {
    const { errors } = await validateDto({
      operation: Operation.SALE,
      type: PropertyType.APARTMENT,
    });

    expect(errors).toHaveLength(0);
  });

  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const asQuery = {
    type: 'query' as const,
    metatype: PublicPropertyFiltersDto,
  };

  it('accepts featured as a query boolean and code as a string (feature 7)', async () => {
    const dto = (await pipe.transform(
      { featured: 'true', code: 'sp-0007' },
      asQuery,
    )) as PublicPropertyFiltersDto;

    expect(dto.featured).toBe(true);
    expect(dto.code).toBe('sp-0007');
  });

  it('rejects a non-boolean featured and an over-long code', async () => {
    await expect(
      pipe.transform({ featured: 'yes' }, asQuery),
    ).rejects.toThrow();
    await expect(
      pipe.transform({ code: 'X'.repeat(21) }, asQuery),
    ).rejects.toThrow();
  });

  it('still rejects unknown query fields through the full ValidationPipe (whitelist + forbidNonWhitelisted)', async () => {
    await expect(pipe.transform({ q: 'casa' }, asQuery)).rejects.toThrow();
  });
});
