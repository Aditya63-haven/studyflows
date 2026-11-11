import { useEffect, useState } from 'react';
import { AlertCard } from '../components/AlertCard';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { DayTabs } from '../components/DayTabs';
import { ErrorBanner } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { PageHeader } from '../components/PageHeader';
import { ProgressBar } from '../components/ProgressBar';
import { TimeRangeRow } from '../components/TimeRangeRow';
import { Toast } from '../components/Toast';
import { useAvailability } from '../availability/useAvailability';
import {
  SHORT_WEEKDAY_LABELS,
  WEEKDAY_LABELS,
  createWindow,
  currentDayIndex,
  type AvailabilityWindow,
  type DayPlanMode,
} from '../availability/availabilityApi';

const timezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown timezone';
  } catch {
    return 'Unknown timezone';
  }
};

interface DayForm {
  mode: DayPlanMode;
  budgetMinutes: number;
  windows: AvailabilityWindow[];
  unavailable: boolean;
}

export const AvailabilityPage = () => {
  const { week, loading, saveDay, preferences, savePreferences } = useAvailability();
  const [selectedDay, setSelectedDay] = useState(currentDayIndex());
  const [form, setForm] = useState<DayForm | null>(null);
  const [sessionLength, setSessionLength] = useState(preferences.sessionLengthMinutes);
  const [breakLength, setBreakLength] = useState(preferences.breakLengthMinutes);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (loading) {
      return;
    }
    setSessionLength(preferences.sessionLengthMinutes);
    setBreakLength(preferences.breakLengthMinutes);
  }, [loading, preferences.sessionLengthMinutes, preferences.breakLengthMinutes]);

  useEffect(() => {
    if (loading || week.length === 0) {
      return;
    }
    const day = week[selectedDay];
    setForm({
      mode: day.mode,
      budgetMinutes: day.budgetMinutes,
      windows: day.windows.map((window) => ({ ...window })),
      unavailable: day.unavailable,
    });
    setError(null);
  }, [loading, week, selectedDay]);

  if (loading || !form) {
    return <Loading label="Loading your availability..." />;
  }

  const weekday = WEEKDAY_LABELS[selectedDay];
  const currentForm: DayForm = form;
  const exactMinutes = form.windows.reduce((total, window) => {
    const [startHour, startMinute] = window.start.split(':').map(Number);
    const [endHour, endMinute] = window.end.split(':').map(Number);
    const start = startHour * 60 + (startMinute || 0);
    const end = endHour * 60 + (endMinute || 0);
    return total + (end > start ? end - start : 0);
  }, 0);

  const budget = form.budgetMinutes;
  const flexible = Math.max(0, budget - exactMinutes);

  const updateWindow = (id: string, start: string, end: string) => {
    setForm({
      ...currentForm,
      windows: currentForm.windows.map((window) =>
        window.id === id ? { ...window, start, end } : window,
      ),
    });
  };

  const removeWindow = (id: string) => {
    setForm({
      ...currentForm,
      windows: currentForm.windows.filter((window) => window.id !== id),
    });
  };

  const addWindow = () => {
    setForm({
      ...currentForm,
      windows: [...currentForm.windows, createWindow()],
    });
  };

  const handleSave = async () => {
    setError(null);
    if (form.mode === 'budget-windows') {
      const invalid = form.windows.some((window) => {
        const [startHour, startMinute] = window.start.split(':').map(Number);
        const [endHour, endMinute] = window.end.split(':').map(Number);
        const start = startHour * 60 + (startMinute || 0);
        const end = endHour * 60 + (endMinute || 0);
        return !window.start || !window.end || end <= start;
      });
      if (invalid) {
        setError('Each window needs a start and an end time, and the end must be after the start.');
        return;
      }
    }
    if (form.budgetMinutes < 0 || form.budgetMinutes > 1440) {
      setError('The study budget must be between 0 and 1440 minutes.');
      return;
    }
    try {
      await saveDay(selectedDay, {
        mode: form.mode,
        budgetMinutes: form.budgetMinutes,
        windows: form.windows,
        unavailable: form.unavailable,
      });
      setToast(`${weekday} availability saved.`);
    } catch {
      setError('Could not save availability. Please try again.');
    }
  };

  const toggleUnavailable = async () => {
    setError(null);
    try {
      const next = {
        mode: form.mode,
        budgetMinutes: form.budgetMinutes,
        windows: form.windows,
        unavailable: !form.unavailable,
      };
      setForm(next);
      await saveDay(selectedDay, next);
      setToast(next.unavailable ? `${weekday} marked unavailable.` : `${weekday} is available again.`);
    } catch {
      setError('Could not update this day. Please try again.');
    }
  };

  const handlePreferences = async () => {
    setError(null);
    if (sessionLength < 5 || sessionLength > 240 || breakLength < 0 || breakLength > 60) {
      setError('Session length must be 5-240 minutes and breaks 0-60 minutes.');
      return;
    }
    try {
      await savePreferences({ sessionLengthMinutes: sessionLength, breakLengthMinutes: breakLength });
      setToast('Session preferences saved.');
    } catch {
      setError('Could not save preferences. Please try again.');
    }
  };

  return (
    <div className="stack large">
      <PageHeader
        eyebrow="A plan that fits your life"
        title="Your study availability"
        description="Start with daily hours. Add exact windows when useful."
        actions={<span className="muted small-text">Timezone · {timezone()}</span>}
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <DayTabs
        days={week.map((day, index) => ({
          label: SHORT_WEEKDAY_LABELS[index],
          minutes: day.unavailable ? 'Unavailable' : `${day.budgetMinutes} min`,
        }))}
        selected={selectedDay}
        onSelect={setSelectedDay}
      />

      <div className="split-grid">
        <Card title={`${weekday} availability`}>
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSave();
            }}
          >
            <label className="field" htmlFor="day-plan-mode">
              <span>How would you like to plan this day?</span>
              <select
                id="day-plan-mode"
                value={form.mode}
                onChange={(event) =>
                  setForm({
                    ...currentForm,
                    mode: event.target.value as DayPlanMode,
                  })
                }
              >
                <option value="budget">Daily budget</option>
                <option value="budget-windows">Daily budget + exact windows</option>
              </select>
            </label>

            <label className="field" htmlFor="day-budget">
              <span>Total study budget (minutes)</span>
              <input
                id="day-budget"
                type="number"
                min={0}
                max={1440}
                step={15}
                value={form.budgetMinutes}
                onChange={(event) =>
                  setForm({
                    ...currentForm,
                    budgetMinutes: Number(event.target.value),
                  })
                }
                required
              />
            </label>

            {form.mode === 'budget-windows' ? (
              <div className="stack">
                <span className="field-label">Exact availability windows</span>
                {form.windows.length === 0 ? (
                  <p className="muted small-text">
                    No windows yet. Add one to plan study at a specific time.
                  </p>
                ) : (
                  form.windows.map((window) => (
                    <TimeRangeRow
                      key={window.id}
                      id={window.id}
                      start={window.start}
                      end={window.end}
                      onChange={updateWindow}
                      onRemove={removeWindow}
                    />
                  ))
                )}
                <div>
                  <Button variant="secondary" onClick={addWindow}>
                    Add a window
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="form-actions">
              <Button type="submit">Save availability</Button>
              <Button variant="secondary" onClick={() => void toggleUnavailable()}>
                {form.unavailable ? 'Mark day available' : 'Mark day unavailable'}
              </Button>
            </div>
          </form>
        </Card>

        <div className="stack large">
          <Card title="Daily capacity">
            {form.unavailable ? (
              <>
                <p className="capacity-big">Marked unavailable</p>
                <p className="muted">
                  No study sessions will be planned for {weekday}. Your budget stays saved if you
                  make the day available again.
                </p>
              </>
            ) : (
              <>
                <p className="capacity-big">{budget} minutes of study</p>
                <ProgressBar
                  value={budget > 0 ? Math.min(100, (exactMinutes / budget) * 100) : 0}
                  label={`${Math.min(exactMinutes, budget)}/${budget}`}
                />
                <p className="muted small-text">
                  {exactMinutes} minutes of exact-window capacity within the {budget}-minute study
                  budget. {flexible} minute{flexible === 1 ? '' : 's'} remain flexible before
                  accounting for breaks.
                </p>
                <AlertCard title="One budget, not two">
                  Exact-window study counts toward the daily budget. Breaks occupy window time but
                  do not count as study minutes.
                </AlertCard>
                <p className="footnote">
                  If windows overlap or push past your budget, StudyFlows suggests a review
                  adjustment instead of silently over-planning your day.
                </p>
              </>
            )}
          </Card>

          <Card
            title="Session preferences"
            description="Used when planning sessions inside your windows."
          >
            <form
              className="stack"
              onSubmit={(event) => {
                event.preventDefault();
                void handlePreferences();
              }}
            >
              <label className="field" htmlFor="session-length">
                <span>Preferred session length (minutes)</span>
                <input
                  id="session-length"
                  type="number"
                  min={5}
                  max={240}
                  step={5}
                  value={sessionLength}
                  onChange={(event) => setSessionLength(Number(event.target.value))}
                  required
                />
              </label>
              <label className="field" htmlFor="break-length">
                <span>Break length (minutes)</span>
                <input
                  id="break-length"
                  type="number"
                  min={0}
                  max={60}
                  step={5}
                  value={breakLength}
                  onChange={(event) => setBreakLength(Number(event.target.value))}
                  required
                />
              </label>
              <div className="form-actions">
                <Button type="submit">Save preferences</Button>
              </div>
            </form>
          </Card>
        </div>
      </div>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
};
