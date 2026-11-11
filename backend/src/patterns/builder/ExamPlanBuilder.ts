import { ValidationError } from '../../errors';
import { addDays, startOfDay } from '../../domain/base/helpers';
import { ExamPlan } from '../../domain/entities/ExamPlan';
import { StudyDay } from '../../domain/entities/StudyDay';
import { Topic } from '../../domain/entities/Topic';

/**
 * Fluent builder for ExamPlan objects.
 *
 * OOP: Builder - separates the step-by-step plan construction from the final
 * ExamPlan instance.
 * OOP: Composition - the builder creates StudyDays owned by the plan.
 */
export class ExamPlanBuilder {
  private name = '';
  private ownerId = '';
  private examDate: Date | null = null;
  private dailyStudyHours = 2;
  private topics: Topic[] = [];

  public setName(name: string): this {
    this.name = name;
    return this;
  }

  public setOwnerId(ownerId: string): this {
    this.ownerId = ownerId;
    return this;
  }

  public setExamDate(examDate: Date): this {
    this.examDate = examDate;
    return this;
  }

  public setDailyStudyHours(hours: number): this {
    this.dailyStudyHours = hours;
    return this;
  }

  public addTopic(topic: Topic): this {
    this.topics.push(topic);
    return this;
  }

  public setTopics(topics: Topic[]): this {
    this.topics = [...topics];
    return this;
  }

  /**
   * Builds a day-by-day plan from today until the exam date.
   */
  public build(now: Date = new Date()): ExamPlan {
    if (!this.name.trim()) {
      throw new ValidationError('Exam plan name is required');
    }
    if (!this.ownerId.trim()) {
      throw new ValidationError('Exam plan ownerId is required');
    }
    if (!this.examDate) {
      throw new ValidationError('Exam date is required');
    }

    const start = startOfDay(now);
    const exam = startOfDay(this.examDate);
    if (exam.getTime() < start.getTime()) {
      throw new ValidationError('Exam date cannot be in the past');
    }

    const capacityMinutes = Math.max(1, Math.round(this.dailyStudyHours * 60));
    const remaining = [...this.topics];
    const studyDays: StudyDay[] = [];
    let currentDate = new Date(start.getTime());

    while (remaining.length > 0 && currentDate.getTime() <= exam.getTime()) {
      const topicIds: string[] = [];
      let plannedMinutes = 0;

      while (remaining.length > 0) {
        const candidate = remaining[0];
        const cost = candidate.getEstimatedMinutes();
        if (topicIds.length > 0 && plannedMinutes + cost > capacityMinutes) {
          break;
        }
        topicIds.push(candidate.getId());
        plannedMinutes += cost;
        remaining.shift();
      }

      studyDays.push(
        new StudyDay({
          date: new Date(currentDate.getTime()),
          topicIds,
          plannedMinutes: Math.min(plannedMinutes, 1440),
        }),
      );
      currentDate = addDays(currentDate, 1);
    }

    if (remaining.length > 0) {
      const lastDay = studyDays[studyDays.length - 1];
      for (const topic of remaining) {
        if (lastDay) {
          lastDay.addTopic(topic.getId(), topic.getEstimatedMinutes());
        } else {
          studyDays.push(
            new StudyDay({
              date: new Date(start.getTime()),
              topicIds: [topic.getId()],
              plannedMinutes: Math.min(topic.getEstimatedMinutes(), 1440),
            }),
          );
        }
      }
    }

    return new ExamPlan({
      name: this.name,
      ownerId: this.ownerId,
      examDate: this.examDate,
      dailyStudyHours: this.dailyStudyHours,
      topics: this.topics,
      studyDays,
    });
  }
}
