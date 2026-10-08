import {
  clientsCsvFilename,
  csvCell,
  CSV_BOM,
  formatArgDateTime,
  toCsv,
} from './csv';

describe('csvCell', () => {
  it('leaves plain values untouched', () => {
    expect(csvCell('Ana García')).toBe('Ana García');
    expect(csvCell(3)).toBe('3');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('quotes values with the separator, quotes or line breaks and doubles quotes', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('a,b')).toBe('a,b');
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
  it('starts with a UTF-8 BOM, uses ; and CRLF and ends with a line break', () => {
    const csv = toCsv(['a', 'b'], [['1', 'x;y']]);

    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv).toBe(`${CSV_BOM}a;b\r\n1;"x;y"\r\n`);
  });
});

describe('formatArgDateTime', () => {
  it('formats dd/mm/aaaa hh:mm in Buenos Aires time', () => {
    expect(formatArgDateTime(new Date('2026-09-30T10:00:00Z'))).toBe(
      '30/09/2026 07:00',
    );
    // 02:30Z is still the previous day in Argentina (UTC-3).
    expect(formatArgDateTime(new Date('2026-10-01T02:30:00Z'))).toBe(
      '30/09/2026 23:30',
    );
  });

  it('leaves missing dates empty', () => {
    expect(formatArgDateTime(null)).toBe('');
    expect(formatArgDateTime(undefined)).toBe('');
  });
});

describe('clientsCsvFilename', () => {
  it('uses the Buenos Aires calendar day', () => {
    expect(clientsCsvFilename(new Date('2026-10-08T15:00:00Z'))).toBe(
      'clientes-2026-10-08.csv',
    );
    expect(clientsCsvFilename(new Date('2026-10-09T01:00:00Z'))).toBe(
      'clientes-2026-10-08.csv',
    );
  });
});
