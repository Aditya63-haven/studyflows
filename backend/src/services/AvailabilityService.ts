import { ValidationError } from '../errors';
import { AvailabilityWindow } from '../domain/entities/AvailabilityWindow';
import { DayAvailability } from '../domain/entities/DayAvailability';
import { StudentAvailability } from '../domain/entities/StudentAvailability';
import { timeStringToMinutes } from '../domain/base/helpers';
import { AvailabilityRepository } from '../repositories/AvailabilityRepository';

export interface AvailabilityWindowInput {
  id?: string;
  start: string;
  end: string;
}

export interface DayAvailabilityInput {
  mode: 'budget' | 'budget-windows';
  budgetMinutes: number;
  available: boolean;
  windows: AvailabilityWindowInput[];
}

/**
 * Study availability use cases.
 *
 * OOP: DIP - depends on the AvailabilityRepository abstraction injected
 * through the constructor.
 */
export class AvailabilityService {
  constructor(private readonly availabilityRepository: AvailabilityRepository) {}

  /**
   * Returns the saved weekly availability, or a default week when the user
   * has not configured one yet.
   */
  public async getByUser(userId: string): Promise<StudentAvailability> {
    const stored = await this.availabilityRepository.findByOwner(userId);
    return stored ?? StudentAvailability.defaultFor(userId);
  }

  public async saveWeek(
    userId: string,
    days: DayAvailabilityInput[],
  ): Promise<StudentAvailability> {
    if (!Array.isArray(days) || days.length !== 7) {
      throw new ValidationError('Exactly seven days are required');
    }

    const availability = await this.loadForUpdate(userId);
    days.forEach((day, weekday) => {
      availability.setDay(AvailabilityService.toDay(weekday, day));
    });
    return this.persist(availability);
  }

  public async saveDay(
    userId: string,
    weekday: number,
    day: DayAvailabilityInput,
  ): Promise<StudentAvailability> {
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      throw new ValidationError('weekday must be between 0 and 6');
    }

    const availability = await this.loadForUpdate(userId);
    availability.setDay(AvailabilityService.toDay(weekday, day));
    return this.persist(availability);
  }

  private async loadForUpdate(userId: string): Promise<StudentAvailability> {
    const stored = await this.availabilityRepository.findByOwner(userId);
    return stored ?? StudentAvailability.defaultFor(userId);
  }

  private async persist(availability: StudentAvailability): Promise<StudentAvailability> {
    const existing = await this.availabilityRepository.findByOwner(
      availability.getUserId(),
    );
    if (existing) {
      const updated = await this.availabilityRepository.update(
        existing.getId(),
        availability,
      );
      if (updated) {
        return updated;
      }
    }
    return this.availabilityRepository.create(availability);
  }

  private static toDay(weekday: number, input: DayAvailabilityInput): DayAvailability {
    return new DayAvailability({
      weekday,
      mode: input.mode,
      budgetMinutes: input.budgetMinutes,
      available: input.available,
      windows: input.windows.map(
        (window) =>
          new AvailabilityWindow({
            id: window.id,
            startMinutes: timeStringToMinutes(window.start),
            endMinutes: timeStringToMinutes(window.end),
          }),
      ),
    });
  }
}
