import { numericTransformer } from './numeric.transformer';

describe('numericTransformer', () => {
  describe('to() — JS number -> DB value', () => {
    it('passes a positive decimal number through unchanged', () => {
      expect(numericTransformer.to(1234.5)).toBe(1234.5);
    });

    it('passes zero through unchanged', () => {
      expect(numericTransformer.to(0)).toBe(0);
    });

    it('passes null through unchanged', () => {
      expect(numericTransformer.to(null)).toBeNull();
    });

    it('passes undefined through unchanged', () => {
      expect(numericTransformer.to(undefined)).toBeUndefined();
    });
  });

  describe('from() — DB string -> JS number', () => {
    it('converts a decimal string to a number', () => {
      expect(numericTransformer.from('1234.50')).toBe(1234.5);
    });

    it('converts an integer-looking string to a number', () => {
      expect(numericTransformer.from('0')).toBe(0);
    });

    it('passes null through unchanged', () => {
      expect(numericTransformer.from(null)).toBeNull();
    });

    it('passes undefined through unchanged', () => {
      expect(numericTransformer.from(undefined)).toBeUndefined();
    });
  });

  describe('round-trip', () => {
    it('round-trips a value through to() then from()', () => {
      const original = 99999999.99;
      const dbValue = numericTransformer.to(original);
      expect(numericTransformer.from(String(dbValue))).toBe(original);
    });
  });
});
