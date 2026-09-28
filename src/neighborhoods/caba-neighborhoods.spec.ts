import { CABA_NEIGHBORHOODS } from '../migrations/1790500000000-CreateNeighborhoods';
import { slugify } from '../common/utils/slugify';

describe('CABA_NEIGHBORHOODS', () => {
  it('contains exactly 48 entries', () => {
    expect(CABA_NEIGHBORHOODS).toHaveLength(48);
  });

  it('has all unique names', () => {
    const names = CABA_NEIGHBORHOODS.map((n) => n.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('has all unique slugs', () => {
    const slugs = CABA_NEIGHBORHOODS.map((n) => n.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it.each(CABA_NEIGHBORHOODS.map((n) => [n.name, n.slug]))(
    'slug of "%s" equals slugify(name): "%s"',
    (name, expectedSlug) => {
      expect(slugify(name)).toBe(expectedSlug);
    },
  );
});
