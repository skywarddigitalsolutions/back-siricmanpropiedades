import { buildPropertySlug, formatPropertyCode } from './property-identifiers';

describe('formatPropertyCode', () => {
  it('formats a sequence value as SP-<n>', () => {
    expect(formatPropertyCode(101)).toBe('SP-101');
  });

  it('formats a different sequence value with the same prefix', () => {
    expect(formatPropertyCode(250)).toBe('SP-250');
  });
});

describe('buildPropertySlug', () => {
  it('slugifies the title and appends the lowercased code suffix', () => {
    expect(
      buildPropertySlug('Departamento 3 ambientes en Palermo', 'SP-101'),
    ).toBe('departamento-3-ambientes-en-palermo-sp-101');
  });

  it('truncates the slugified title to 80 characters before appending the code', () => {
    const longTitle =
      'Casa enorme con parque gigante y pileta climatizada en un barrio muy tranquilo y arbolado de Buenos Aires';
    const result = buildPropertySlug(longTitle, 'SP-205');
    const suffix = '-sp-205';

    expect(result.endsWith(suffix)).toBe(true);
    expect(result.length - suffix.length).toBeLessThanOrEqual(80);
  });
});
