import { ValidationError } from '../../errors';
import { requireNumberInRange } from '../base/helpers';
import { AvailabilityWindow } from './AvailabilityWindow';

export type DayPlanMode = 'budget' | 'budget-windows';

export interface DayAvailabilityProps {
  /** Monday-based weekday index (Monday = 0 ... Sunday = 6). */
  weekday: number;
  mode?: DayPlanMode;
  budgetMinutes: number;
  windows?: AvailabilityWindow[];
  available?: boolean;
}

const DEFAULT_BUDGET_MINUTES = 120;

/**
 * Study availability for one weekday of the week.
 *
 * OOP: Composition - DayAvailability owns its AvailabilityWindows; they are
 * created, replaced and discarded together with the day.
 * OOP: Encapsulation - the budget, mode and windows are validated so an
 * invalid day can never exist.
 */
export class DayAvailability {
  private readonly _weekday: number;
  private _mode: DayPlanMode;
  private _budgetMinutes: number;
  private _windows: AvailabilityWindow[];
  private _available: boolean;

  constructor(props: DayAvailabilityProps) {
    this._weekday = requireNumberInRange(props.weekday, 'weekday', 0, 6);
    this._mode = DayAvailability.parseMode(props.mode ?? 'budget');
    this._budgetMinutes = requireNumberInRange(
      props.budgetMinutes,
      'budgetMinutes',
      0,
      1440,
    );
    this._available = props.available ?? true;
    this._windows = [];
    this.setWindows(props.windows ?? []);
  }

  public getWeekday(): number {
    return this._weekday;
  }

  public getMode(): DayPlanMode {
    return this._mode;
  }

  public setMode(mode: DayPlanMode): void {
    this._mode = DayAvailability.parseMode(mode);
  }

  public getBudgetMinutes(): number {
    return this._budgetMinutes;
  }

  public setBudgetMinutes(minutes: number): void {
    this._budgetMinutes = requireNumberInRange(minutes, 'budgetMinutes', 0, 1440);
    this.validateWindows();
  }

  public isAvailable(): boolean {
    return this._available;
  }

  public setAvailable(available: boolean): void {
    this._available = available;
  }

  public getWindows(): AvailabilityWindow[] {
    return [...this._windows];
  }

  public setWindows(windows: AvailabilityWindow[]): void {
    this._windows = windows.map((window) => {
      if (!(window instanceof AvailabilityWindow)) {
        throw new ValidationError('windows must contain AvailabilityWindow instances');
      }
      return window;
    });
    this.validateWindows();
  }

  public addWindow(window: AvailabilityWindow): void {
    if (!(window instanceof AvailabilityWindow)) {
      throw new ValidationError('window must be an AvailabilityWindow instance');
    }
    this.setWindows([...this._windows, window]);
  }

  public removeWindow(windowId: string): boolean {
    const before = this._windows.length;
    this.setWindows(this._windows.filter((window) => window.getId() !== windowId));
    return this._windows.length !== before;
  }

  /**
   * Total minutes covered by the exact windows.
   */
  public getWindowMinutes(): number {
    return this._windows.reduce((total, window) => total + window.getDurationMinutes(), 0);
  }

  public static defaultFor(weekday: number): DayAvailability {
    return new DayAvailability({
      weekday,
      mode: 'budget',
      budgetMinutes: DEFAULT_BUDGET_MINUTES,
      windows: [],
      available: true,
    });
  }

  private validateWindows(): void {
    const sorted = [...this._windows].sort(
      (left, right) => left.getStartMinutes() - right.getStartMinutes(),
    );

    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index - 1].overlaps(sorted[index])) {
        throw new ValidationError('Availability windows must not overlap');
      }
    }

    if (this.getWindowMinutes() > this._budgetMinutes) {
      throw new ValidationError('Window minutes cannot exceed the daily budget');
    }
  }

  private static parseMode(mode: unknown): DayPlanMode {
    if (mode !== 'budget' && mode !== 'budget-windows') {
      throw new ValidationError('mode must be "budget" or "budget-windows"');
    }
    return mode;
  }
}
