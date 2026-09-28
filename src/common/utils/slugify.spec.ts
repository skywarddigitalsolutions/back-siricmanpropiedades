import { slugify } from './slugify';

describe('slugify', () => {
  const cases: Array<[string, string]> = [
    ['Palermo', 'palermo'],
    ['Núñez', 'nunez'],
    ['Agronomía', 'agronomia'],
    ['San Nicolás', 'san-nicolas'],
    ['Vélez Sarsfield', 'velez-sarsfield'],
    ['Villa Ortúzar', 'villa-ortuzar'],
    ['Constitución', 'constitucion'],
    ["Villa Devoto Norte's", 'villa-devoto-norte-s'],
    ['La   Boca!!', 'la-boca'],
    ['  --Recoleta--  ', 'recoleta'],
    ['Parque   Chas', 'parque-chas'],
  ];

  it.each(cases)('slugifies "%s" to "%s"', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('handles the full ñ / accented-vowel set via NFD normalization', () => {
    expect(slugify('áéíóúñÁÉÍÓÚÑ')).toBe('aeiounaeioun');
  });

  it('collapses repeated separators produced by punctuation runs into a single dash', () => {
    expect(slugify('Villa===Crespo')).toBe('villa-crespo');
  });

  it('trims leading and trailing dashes produced by leading/trailing punctuation', () => {
    expect(slugify('-Monserrat-')).toBe('monserrat');
  });
});
