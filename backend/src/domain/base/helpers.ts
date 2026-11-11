import { randomUUID } from 'crypto';
import { ValidationError } from '../../errors';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Resolves an entity id, generating a new UUID when one is not supplied.
 */
export const resolveId = (value?: string): string => {
  return value?.trim() || randomUUID();
};

/**
 * Ensures a value is a non-empty string and returns it trimmed.
 */
export const requireNonEmpty = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
};

/**
 * Ensures a value is a string without forcing it to be non-empty.
 */
export const requireString = (value: unknown, field: string, allowEmpty = true): string => {
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`);
  }
  if (!allowEmpty && value.trim().length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  return value;
};

/**
 * Ensures a value is a finite number inside an inclusive range.
 */
export const requireNumberInRange = (
  value: unknown,
  field: string,
  min: number,
  max: number,
): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(`${field} must be a number`);
  }
  if (value < min || value > max) {
    throw new ValidationError(`${field} must be between ${min} and ${max}`);
  }
  return value;
};

/**
 * Ensures a value is a valid Date and returns a defensive copy.
 */
export const requireDate = (value: unknown, field: string): Date => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new ValidationError(`${field} must be a valid date`);
  }
  return new Date(value.getTime());
};

/**
 * Validates a date when provided, otherwise returns the fallback.
 */
export const optionalDate = (
  value: Date | null | undefined,
  field: string,
  fallback: Date | null = null,
): Date | null => {
  if (value === null || value === undefined) {
    return fallback;
  }
  return requireDate(value, field);
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

export const roundTo = (value: number, decimals = 2): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export const addDays = (date: Date, days: number): Date => {
  return new Date(date.getTime() + days * MILLISECONDS_PER_DAY);
};

export const startOfDay = (date: Date): Date => {
  const copy = new Date(date.getTime());
  copy.setHours(0, 0, 0, 0);
  return copy;
};

export const endOfDay = (date: Date): Date => {
  const copy = new Date(date.getTime());
  copy.setHours(23, 59, 59, 999);
  return copy;
};

/**
 * Copies and deduplicates a list of string ids.
 */
export const uniqueIds = (ids: string[]): string[] => {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
};

/**
 * Local-time YYYY-MM-DD key used to compare calendar days.
 */
export const dateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Monday-based weekday index (Monday = 0 ... Sunday = 6), matching the
 * availability API.
 */
export const weekdayIndex = (date: Date): number => (date.getDay() + 6) % 7;

/**
 * Parses an "HH:MM" time string into minutes since midnight.
 */
export const timeStringToMinutes = (value: string): number => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    throw new ValidationError(`Time must be in HH:MM format (received "${value}")`);
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const total = hours * 60 + minutes;
  if (hours > 23 || minutes > 59 || total > 1439) {
    throw new ValidationError(`Time must be a valid clock time (received "${value}")`);
  }
  return total;
};

/**
 * Formats minutes since midnight as an "HH:MM" time string.
 */
export const minutesToTimeString = (minutes: number): string => {
  const clamped = Math.max(0, Math.min(1439, Math.round(minutes)));
  const hours = Math.floor(clamped / 60);
  const remainder = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};
