import { csvCell, toCsv, CSV_BOM } from './csv';

describe('csvCell', () => {
  it('leaves plain values untouched', () => {
    expect(csvCell('Ana García')).toBe('Ana García');
    expect(csvCell(3)).toBe('3');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('quotes values with commas, quotes or line breaks and doubles quotes', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('di "hola"')).toBe('"di ""hola"""');
    expect(csvCell('uno\ndos')).toBe('"uno\ndos"');
    expect(csvCell('uno\r\ndos')).toBe('"uno\r\ndos"');
  });

  it.each(['=SUM(A1)', '+54 9 11', '-1', '@cmd', '\tx', '\rx'])(
    'neutralises formula injection in %j with a leading single quote',
    (value) => {
      const cell = csvCell(value);
      const raw = cell.startsWith('"') ? cell.slice(1, -1) : cell;
      expect(raw.startsWith("'")).toBe(true);
    },
  );

  it('formats dates as ISO strings', () => {
    expect(csvCell(new Date('2026-09-30T12:00:00Z'))).toBe(
      '2026-09-30T12:00:00.000Z',
    );
  });
});

describe('toCsv', () => {
  it('starts with a UTF-8 BOM, uses CRLF and ends with a line break', () => {
    const csv = toCsv(['a', 'b'], [['1', 'x,y']]);

    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv).toBe(`${CSV_BOM}a,b\r\n1,"x,y"\r\n`);
  });
});
