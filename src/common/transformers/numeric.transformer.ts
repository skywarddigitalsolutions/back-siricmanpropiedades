import { ValueTransformer } from 'typeorm';

/**
 * Postgres `numeric` columns are returned by the driver as strings (to avoid
 * silent precision loss on very large values). Every entity column that maps
 * to `numeric` MUST use this transformer so callers always see a JS `number`.
 */
export const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null | undefined) => {
    if (value === null || value === undefined) return value;
    return parseFloat(value);
  },
};
