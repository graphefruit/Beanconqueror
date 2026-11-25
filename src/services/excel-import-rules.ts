import { BEAN_MIX_ENUM } from '../enums/beans/mix';

/** A cell of an imported row that was not read; its field keeps its default. */
export interface ExcelImportIssue {
  /** The row as Excel counts it, with the header in row 1. */
  row: number;
  /** The header of the column. */
  field: string;
}

/** Days between Excel's day 0 (1899-12-30) and 1970-01-01. */
const EXCEL_DAY_OF_1970 = 25569;
const DAY_IN_MS = 86_400_000;

/**
 * Local midnight of the day, or null when the day does not exist. Local, as
 * the app stores a roast date and the export writes it in local time.
 */
function localDay(year: number, month: number, day: number): string | null {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date.toISOString()
    : null;
}

/** An Excel day number as ISO text; 0 is the empty date cell. */
function excelDay(days: number): string | null {
  if (days === 0) {
    return '';
  }
  const date = new Date((days - EXCEL_DAY_OF_1970) * DAY_IN_MS);
  return days > 0 && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

/**
 * A date cell as ISO text. Excel stores a date as a day number; dates typed
 * as text come as ISO date (with or without a time) or as DD.MM.YYYY, the
 * date format of the export; a day without a time is local midnight. '' for an
 * empty cell and for 0, null for a value that is no date.
 */
export function readExcelDate(value: unknown): string | null {
  if (typeof value === 'number') {
    return excelDay(value);
  }
  if (typeof value !== 'string') {
    return value === undefined || value === null ? '' : null;
  }
  const text = value.trim();
  // Older exports wrote 'Invalid date' for a bean without the date.
  if (text === '' || text === 'Invalid date') {
    return '';
  }
  if (/^\d+(\.\d+)?$/.test(text)) {
    return excelDay(Number(text));
  }
  const german = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text);
  if (german) {
    return localDay(Number(german[3]), Number(german[2]), Number(german[1]));
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})(T.+)?$/.exec(text);
  if (!iso) {
    return null;
  }
  const day = localDay(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  if (day === null || iso[4] === undefined) {
    return day;
  }
  const time = new Date(text);
  return Number.isNaN(time.getTime()) ? null : time.toISOString();
}

/**
 * The texts a blend cell can hold, in lower case: the key, the English text
 * that the export writes and has written from the start, and the German text
 * of the app. The other languages are not read.
 */
const BEAN_MIX_TEXTS = new Map<string, keyof typeof BEAN_MIX_ENUM>([
  ['unknown', 'UNKNOWN'],
  ['unbekannt', 'UNKNOWN'],
  ['single_origin', 'SINGLE_ORIGIN'],
  ['single origin', 'SINGLE_ORIGIN'],
  ['blend', 'BLEND'],
]);

/**
 * A blend cell as the key a bean stores. '' for an empty cell, null for a
 * text that is none of the known ones.
 */
export function readBeanMix(value: unknown): BEAN_MIX_ENUM | '' | null {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value !== 'string') {
    return null;
  }
  const text = value.trim().toLowerCase();
  if (text === '') {
    return '';
  }
  // A bean stores the key in its field typed as the enum.
  return (BEAN_MIX_TEXTS.get(text) as BEAN_MIX_ENUM) ?? null;
}
