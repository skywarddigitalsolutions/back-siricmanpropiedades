import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReorderPropertyImagesDto } from './reorder-property-images.dto';

const VALID_IDS = [
  'a0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000003',
];

async function validateDto(payload: Record<string, unknown>) {
  const dto = plainToInstance(ReorderPropertyImagesDto, payload);
  const errors = await validate(dto);
  return { dto, errors };
}

describe('ReorderPropertyImagesDto', () => {
  it('accepts a valid array of UUIDs', async () => {
    const { errors } = await validateDto({ imageIds: VALID_IDS });

    expect(errors).toHaveLength(0);
  });

  it('rejects a non-array imageIds', async () => {
    const { errors } = await validateDto({ imageIds: 'not-an-array' });

    expect(errors.some((error) => error.property === 'imageIds')).toBe(true);
  });

  it('rejects an empty array (ArrayMinSize(1))', async () => {
    const { errors } = await validateDto({ imageIds: [] });

    expect(errors.some((error) => error.property === 'imageIds')).toBe(true);
  });

  it('rejects more than 30 entries (ArrayMaxSize(30))', async () => {
    const tooMany = Array.from(
      { length: 31 },
      (_, i) => `a0000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    );

    const { errors } = await validateDto({ imageIds: tooMany });

    expect(errors.some((error) => error.property === 'imageIds')).toBe(true);
  });

  it('rejects a duplicated entry (ArrayUnique())', async () => {
    const { errors } = await validateDto({
      imageIds: [VALID_IDS[0], VALID_IDS[0]],
    });

    expect(errors.some((error) => error.property === 'imageIds')).toBe(true);
  });

  it('rejects a non-UUID entry', async () => {
    const { errors } = await validateDto({
      imageIds: [VALID_IDS[0], 'not-a-uuid'],
    });

    expect(errors.some((error) => error.property === 'imageIds')).toBe(true);
  });
});
