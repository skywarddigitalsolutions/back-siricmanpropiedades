/** UTF-8 byte order mark: makes Excel read accents correctly. */
export const CSV_BOM = '﻿';

/** Spanish-locale Excel splits columns on `;` (the comma is the decimal mark). */
export const CSV_SEPARATOR = ';';

const AR_TIME_ZONE = 'America/Argentina/Buenos_Aires';

const FORMULA_START = /^[=+\-@\t\r]/;

type CsvValue = string | number | Date | null | undefined;

/**
 * One CSV cell. Values that spreadsheets would evaluate as a formula (leading
 * `= + - @`, tab or CR) get a single quote prefix; values with the separator
 * (`;`), quotes or line breaks are quoted with inner quotes doubled (RFC 4180).
 */
export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Header + rows as a CSV document with BOM and CRLF line endings. */
export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers, ...rows].map((r) =>
    r.map(csvCell).join(CSV_SEPARATOR),
  );
  return `${CSV_BOM}${lines.join('\r\n')}\r\n`;
}

const AR_DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: AR_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function arParts(date: Date): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const { type, value } of AR_DATE_TIME.formatToParts(date))
    parts[type] = value;
  return parts;
}

/** `dd/mm/aaaa hh:mm` in Buenos Aires time; empty when there is no date. */
export function formatArgDateTime(date: Date | null | undefined): string {
  if (!date) return '';
  const p = arParts(date);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

/** `clientes-YYYY-MM-DD.csv`, dated by the Buenos Aires calendar day. */
export function clientsCsvFilename(now: Date): string {
  const p = arParts(now);
  return `clientes-${p.year}-${p.month}-${p.day}.csv`;
}
