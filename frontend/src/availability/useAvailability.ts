import { useCallback, useEffect, useState } from 'react';
import {
  availabilityApi,
  type DayAvailability,
  type SessionPreferences,
  type WeeklyAvailability,
} from './availabilityApi';

interface AvailabilityState {
  week: WeeklyAvailability;
  preferences: SessionPreferences;
  loading: boolean;
  saveDay: (dayIndex: number, day: DayAvailability) => Promise<void>;
  savePreferences: (preferences: SessionPreferences) => Promise<void>;
}

export const useAvailability = (): AvailabilityState => {
  const [week, setWeek] = useState<WeeklyAvailability | null>(null);
  const [preferences, setPreferences] = useState<SessionPreferences | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([availabilityApi.getWeek(), availabilityApi.getPreferences()]).then(
      ([storedWeek, storedPreferences]) => {
        if (active) {
          setWeek(storedWeek);
          setPreferences(storedPreferences);
        }
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const saveDay = useCallback(async (dayIndex: number, day: DayAvailability) => {
    const updated = await availabilityApi.saveDay(dayIndex, day);
    setWeek(updated);
  }, []);

  const savePreferences = useCallback(async (next: SessionPreferences) => {
    const saved = await availabilityApi.savePreferences(next);
    setPreferences(saved);
  }, []);

  return {
    week: week ?? [],
    preferences: preferences ?? { sessionLengthMinutes: 45, breakLengthMinutes: 10 },
    loading: week === null,
    saveDay,
    savePreferences,
  };
};
