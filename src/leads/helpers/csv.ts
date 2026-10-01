/** UTF-8 byte order mark: makes Excel read accents correctly. */
export const CSV_BOM = '﻿';

const FORMULA_START = /^[=+\-@\t\r]/;

type CsvValue = string | number | Date | null | undefined;

/**
 * One CSV cell. Values that spreadsheets would evaluate as a formula (leading
 * `= + - @`, tab or CR) get a single quote prefix; values with commas, quotes
 * or line breaks are quoted with inner quotes doubled (RFC 4180).
 */
export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Header + rows as a CSV document with BOM and CRLF line endings. */
export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers, ...rows].map((r) => r.map(csvCell).join(','));
  return `${CSV_BOM}${lines.join('\r\n')}\r\n`;
}
