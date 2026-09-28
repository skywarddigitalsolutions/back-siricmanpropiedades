import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateNeighborhoodDto } from './create-neighborhood.dto';

async function validateDto(payload: Record<string, unknown>) {
  const dto = plainToInstance(CreateNeighborhoodDto, payload);
  const errors = await validate(dto);
  return { dto, errors };
}

describe('CreateNeighborhoodDto', () => {
  it('rejects an empty name', async () => {
    const { errors } = await validateDto({ name: '' });

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a whitespace-only name', async () => {
    const { errors } = await validateDto({ name: '   ' });

    expect(errors.length).toBeGreaterThan(0);
  });

  it('trims and collapses irregular internal spacing before the value is used downstream', async () => {
    const { dto, errors } = await validateDto({
      name: '  Villa   Devoto   Norte  ',
    });

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Villa Devoto Norte');
  });

  it('accepts a valid 2-100 char name', async () => {
    const { dto, errors } = await validateDto({ name: 'Palermo' });

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Palermo');
  });
});
