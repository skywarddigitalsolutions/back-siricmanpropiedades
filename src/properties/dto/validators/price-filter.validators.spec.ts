import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  IsGreaterThanOrEqualTo,
  RequiresCurrency,
} from './price-filter.validators';

class RequiresCurrencyTestDto {
  currency?: string;

  @RequiresCurrency()
  priceMin?: number;
}

const isPriceSort = (value: unknown) =>
  value === 'price_asc' || value === 'price_desc';

class RequiresCurrencySortTestDto {
  currency?: string;

  @RequiresCurrency(isPriceSort)
  sort?: string;
}

class GreaterThanOrEqualTestDto {
  priceMin?: number;

  @IsGreaterThanOrEqualTo('priceMin')
  priceMax?: number;
}

describe('RequiresCurrency', () => {
  it('fails when the decorated price-related value is defined and currency is undefined', async () => {
    const dto = plainToInstance(RequiresCurrencyTestDto, { priceMin: 100 });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'priceMin')).toBe(true);
  });

  it('passes when the decorated value is defined and currency is also defined', async () => {
    const dto = plainToInstance(RequiresCurrencyTestDto, {
      priceMin: 100,
      currency: 'USD',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('passes when the decorated value is undefined, regardless of currency', async () => {
    const dto = plainToInstance(RequiresCurrencyTestDto, {});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('with a custom predicate, only fails for matching values (e.g. price sorts) without currency', async () => {
    const priceSortWithoutCurrency = plainToInstance(
      RequiresCurrencySortTestDto,
      {
        sort: 'price_asc',
      },
    );
    const nonPriceSortWithoutCurrency = plainToInstance(
      RequiresCurrencySortTestDto,
      { sort: 'newest' },
    );

    const priceSortErrors = await validate(priceSortWithoutCurrency);
    const nonPriceSortErrors = await validate(nonPriceSortWithoutCurrency);

    expect(priceSortErrors.some((error) => error.property === 'sort')).toBe(
      true,
    );
    expect(nonPriceSortErrors.some((error) => error.property === 'sort')).toBe(
      false,
    );
  });

  it('passes for a matching predicate value when currency is also defined', async () => {
    const dto = plainToInstance(RequiresCurrencySortTestDto, {
      sort: 'price_desc',
      currency: 'ARS',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});

describe('IsGreaterThanOrEqualTo', () => {
  it('fails when the decorated value is less than the related property', async () => {
    const dto = plainToInstance(GreaterThanOrEqualTestDto, {
      priceMin: 100,
      priceMax: 50,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'priceMax')).toBe(true);
  });

  it('passes when the decorated value equals the related property', async () => {
    const dto = plainToInstance(GreaterThanOrEqualTestDto, {
      priceMin: 100,
      priceMax: 100,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('passes when the decorated value is greater than the related property', async () => {
    const dto = plainToInstance(GreaterThanOrEqualTestDto, {
      priceMin: 50,
      priceMax: 100,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('passes when either value is undefined', async () => {
    const onlyPriceMax = await validate(
      plainToInstance(GreaterThanOrEqualTestDto, { priceMax: 100 }),
    );
    const onlyPriceMin = await validate(
      plainToInstance(GreaterThanOrEqualTestDto, { priceMin: 100 }),
    );

    expect(onlyPriceMax).toHaveLength(0);
    expect(onlyPriceMin).toHaveLength(0);
  });
});
