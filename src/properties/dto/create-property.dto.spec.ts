import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidationPipe } from '@nestjs/common';
import { CreatePropertyDto } from './create-property.dto';
import { Operation, PropertyType, Currency } from '../enums/property.enums';

const VALID_PAYLOAD = {
  operation: Operation.SALE,
  type: PropertyType.APARTMENT,
  title: 'Departamento 3 ambientes en Palermo',
  neighborhoodId: '11111111-1111-4111-8111-111111111111',
  address: 'Av. Santa Fe 3253',
  currency: Currency.USD,
  price: 150000,
  rooms: 3,
  bedrooms: 2,
  bathrooms: 1,
  coveredArea: 65,
  totalArea: 70,
  age: 5,
};

async function validateDto(payload: Record<string, unknown>) {
  const dto = plainToInstance(CreatePropertyDto, payload);
  const errors = await validate(dto);
  return { dto, errors };
}

describe('CreatePropertyDto', () => {
  it('rejects an invalid enum value for operation', async () => {
    const { errors } = await validateDto({
      ...VALID_PAYLOAD,
      operation: 'lease',
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a payload missing the required price field', async () => {
    const { price, ...withoutPrice } = VALID_PAYLOAD;
    void price;

    const { errors } = await validateDto(withoutPrice);

    expect(errors.some((error) => error.property === 'price')).toBe(true);
  });

  it('rejects a negative totalArea', async () => {
    const { errors } = await validateDto({
      ...VALID_PAYLOAD,
      totalArea: -10,
    });

    expect(errors.some((error) => error.property === 'totalArea')).toBe(true);
  });

  it('accepts a fully valid payload', async () => {
    const { errors } = await validateDto(VALID_PAYLOAD);

    expect(errors).toHaveLength(0);
  });

  it('rejects code/slug/publicationStatus through the full ValidationPipe (whitelist + forbidNonWhitelisted)', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    await expect(
      pipe.transform(
        {
          ...VALID_PAYLOAD,
          code: 'SP-999',
          slug: 'otra-cosa',
          publicationStatus: 'published',
        },
        { type: 'body', metatype: CreatePropertyDto },
      ),
    ).rejects.toThrow();
  });
});
