import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { randomUUID } from 'crypto';
import { CreatePropertyDto } from '../properties/dto/create-property.dto';
import { CABA_NEIGHBORHOODS } from '../migrations/1790500000000-CreateNeighborhoods';
import { Operation } from '../properties/enums/property.enums';
import {
  DEMO_PROPERTIES,
  toCreatePropertyDto,
} from './demo-properties.fixture';

describe('DEMO_PROPERTIES', () => {
  it('holds 8 properties with unique titles and photo folders', () => {
    expect(DEMO_PROPERTIES).toHaveLength(8);
    expect(new Set(DEMO_PROPERTIES.map((p) => p.title)).size).toBe(8);
    expect(new Set(DEMO_PROPERTIES.map((p) => p.photos)).size).toBe(8);
  });

  it.each(DEMO_PROPERTIES.map((p) => [p.title, p] as const))(
    '%s passes the CreatePropertyDto rules',
    async (_title, fixture) => {
      const dto = plainToInstance(
        CreatePropertyDto,
        toCreatePropertyDto(fixture, randomUUID()),
      );
      expect(await validate(dto)).toEqual([]);
    },
  );

  it('uses only neighborhood slugs seeded by the migration', () => {
    const known = new Set(CABA_NEIGHBORHOODS.map((n) => n.slug));
    for (const p of DEMO_PROPERTIES) expect(known).toContain(p.neighborhood);
  });

  it('never shows the exact address and fills the optional fields', () => {
    for (const p of DEMO_PROPERTIES) {
      expect(p.showExactAddress).toBe(false);
      expect(p.description).toContain('\n\n');
      expect(p.expenses).toBeDefined();
      expect(p.marketingTag).toBeDefined();
    }
  });

  it('mixes sale and rent, with featured properties', () => {
    expect(
      DEMO_PROPERTIES.filter((p) => p.operation === Operation.SALE),
    ).toHaveLength(4);
    expect(
      DEMO_PROPERTIES.filter((p) => p.operation === Operation.RENT),
    ).toHaveLength(4);
    expect(DEMO_PROPERTIES.filter((p) => p.featured).length).toBeGreaterThan(1);
  });
});
