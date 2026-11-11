import { DayAvailability, DayPlanMode } from '../../domain/entities/DayAvailability';
import { StudentAvailability } from '../../domain/entities/StudentAvailability';
import { AvailabilityWindow } from '../../domain/entities/AvailabilityWindow';
import { AvailabilityDocument } from '../schemas/availability.schema';

export class AvailabilityMapper {
  public static toDomain(document: AvailabilityDocument): StudentAvailability {
    return new StudentAvailability({
      id: document._id,
      userId: document.owner,
      days: document.days.map(
        (day) =>
          new DayAvailability({
            weekday: day.weekday,
            mode: day.mode as DayPlanMode,
            budgetMinutes: day.budgetMinutes,
            available: day.available,
            windows: day.windows.map(
              (window) =>
                new AvailabilityWindow({
                  id: window._id,
                  startMinutes: window.startMinutes,
                  endMinutes: window.endMinutes,
                }),
            ),
          }),
      ),
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }

  public static toPersistence(availability: StudentAvailability): AvailabilityDocument {
    return {
      _id: availability.getId(),
      owner: availability.getUserId(),
      days: availability.getDays().map((day) => ({
        weekday: day.getWeekday(),
        mode: day.getMode(),
        budgetMinutes: day.getBudgetMinutes(),
        available: day.isAvailable(),
        windows: day.getWindows().map((window) => ({
          _id: window.getId(),
          startMinutes: window.getStartMinutes(),
          endMinutes: window.getEndMinutes(),
        })),
      })),
      createdAt: availability.getCreatedAt(),
      updatedAt: availability.getUpdatedAt(),
    };
  }
}
