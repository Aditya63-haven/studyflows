/**
 * Availability API.
 *
 * Backed by the backend availability endpoints (GET/PUT /api/availability,
 * PUT /api/availability/:weekday). Session preferences remain a local
 * preference. The public types match the shapes used across the UI, so pages
 * do not need to know about the wire format.
 */

import apiClient from '../api/client';

export interface AvailabilityWindow {
  id: string;
  start: string;
  end: string;
}

export type DayPlanMode = 'budget' | 'budget-windows';

export interface DayAvailability {
  mode: DayPlanMode;
  budgetMinutes: number;
  windows: AvailabilityWindow[];
  unavailable: boolean;
}

export type WeeklyAvailability = DayAvailability[];

export interface SessionPreferences {
  sessionLengthMinutes: number;
  breakLengthMinutes: number;
}

interface BackendWindow {
  id: string;
  start: string;
  end: string;
}

interface BackendDay {
  weekday: number;
  mode: DayPlanMode;
  budgetMinutes: number;
  available: boolean;
  windows: BackendWindow[];
}

interface BackendAvailability {
  days: BackendDay[];
}

const PREFERENCES_KEY = 'studyflows.availability.preferences.v1';

export const WEEKDAY_LABELS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export const SHORT_WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const DEFAULT_SESSION_PREFERENCES: SessionPreferences = {
  sessionLengthMinutes: 45,
  breakLengthMinutes: 10,
};

export const currentDayIndex = (): number => (new Date().getDay() + 6) % 7;

export const createWindow = (start = '18:00', end = '19:00'): AvailabilityWindow => ({
  id: crypto.randomUUID(),
  start,
  end,
});

export const createDay = (): DayAvailability => ({
  mode: 'budget',
  budgetMinutes: 120,
  windows: [],
  unavailable: false,
});

export const createWeek = (): WeeklyAvailability => Array.from({ length: 7 }, createDay);

export const timeToMinutes = (value: string): number => {
  const [hours = '0', minutes = '0'] = value.split(':');
  return Number(hours) * 60 + Number(minutes);
};

export const minutesToTime = (minutes: number): string => {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  const hours = Math.floor(clamped / 60);
  const remainder = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

export const formatTimeLabel = (minutes: number): string => {
  const hours = Math.floor(minutes / 60) % 24;
  const remainder = Math.round(minutes % 60);
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${String(remainder).padStart(2, '0')} ${period}`;
};

export const windowMinutes = (window: AvailabilityWindow): number => {
  const start = timeToMinutes(window.start);
  const end = timeToMinutes(window.end);
  return end > start ? end - start : 0;
};

export const dayWindowMinutes = (day: DayAvailability): number =>
  day.windows.reduce((total, window) => total + windowMinutes(window), 0);

const toBackendDay = (day: DayAvailability, weekday: number): BackendDay => ({
  weekday,
  mode: day.mode,
  budgetMinutes: day.budgetMinutes,
  available: !day.unavailable,
  windows: day.windows.map((window) => ({
    id: window.id,
    start: window.start,
    end: window.end,
  })),
});

const fromBackend = (availability: BackendAvailability): WeeklyAvailability =>
  [...availability.days]
    .sort((left, right) => left.weekday - right.weekday)
    .map((day) => ({
      mode: day.mode,
      budgetMinutes: day.budgetMinutes,
      windows: day.windows.map((window) => ({
        id: window.id,
        start: window.start,
        end: window.end,
      })),
      unavailable: !day.available,
    }));

const parseStoredPreferences = (raw: string | null): SessionPreferences | null => {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<SessionPreferences>;
    return {
      sessionLengthMinutes: Number(parsed.sessionLengthMinutes) || 45,
      breakLengthMinutes: Number(parsed.breakLengthMinutes) || 10,
    };
  } catch {
    return null;
  }
};

const readStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode); preferences stay in memory.
  }
};

export const availabilityApi = {
  async getWeek(): Promise<WeeklyAvailability> {
    try {
      const { data } = await apiClient.get<{ availability: BackendAvailability }>(
        '/availability',
      );
      return fromBackend(data.availability);
    } catch {
      // Falls back to a default week so the dashboard keeps rendering when
      // the request fails (e.g. offline). Saving surfaces real errors.
      return createWeek();
    }
  },

  async saveDay(dayIndex: number, day: DayAvailability): Promise<WeeklyAvailability> {
    const { data } = await apiClient.put<{ availability: BackendAvailability }>(
      `/availability/${dayIndex}`,
      toBackendDay(day, dayIndex),
    );
    return fromBackend(data.availability);
  },

  async saveWeek(week: WeeklyAvailability): Promise<WeeklyAvailability> {
    const { data } = await apiClient.put<{ availability: BackendAvailability }>(
      '/availability',
      { days: week.map((day, index) => toBackendDay(day, index)) },
    );
    return fromBackend(data.availability);
  },

  async getPreferences(): Promise<SessionPreferences> {
    return parseStoredPreferences(readStorage(PREFERENCES_KEY)) ?? DEFAULT_SESSION_PREFERENCES;
  },

  async savePreferences(preferences: SessionPreferences): Promise<SessionPreferences> {
    writeStorage(PREFERENCES_KEY, JSON.stringify(preferences));
    return preferences;
  },
};
