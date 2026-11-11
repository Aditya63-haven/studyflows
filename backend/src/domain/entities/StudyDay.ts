import {
  requireDate,
  requireNonEmpty,
  requireNumberInRange,
  resolveId,
  roundTo,
  uniqueIds,
} from '../base/helpers';

export interface StudyDayProps {
  id?: string;
  date: Date;
  topicIds?: string[];
  completedTopicIds?: string[];
  plannedMinutes?: number;
}

/**
 * One scheduled study day inside an exam plan.
 *
 * OOP: Composition - StudyDay is owned by ExamPlan and cannot be managed outside it.
 * OOP: Encapsulation - completion state is updated through validated methods.
 */
export class StudyDay {
  private readonly _id: string;
  private readonly _date: Date;
  private _topicIds: string[];
  private _completedTopicIds: string[];
  private _plannedMinutes: number;

  constructor(props: StudyDayProps) {
    this._id = resolveId(props.id);
    this._date = requireDate(props.date, 'date');
    this._topicIds = uniqueIds(props.topicIds ?? []);
    this._completedTopicIds = uniqueIds(props.completedTopicIds ?? []).filter((topicId) =>
      this._topicIds.includes(topicId),
    );
    this._plannedMinutes = requireNumberInRange(
      props.plannedMinutes ?? 0,
      'plannedMinutes',
      0,
      1440,
    );
  }

  public getId(): string {
    return this._id;
  }

  public getDate(): Date {
    return new Date(this._date.getTime());
  }

  public getTopicIds(): string[] {
    return [...this._topicIds];
  }

  public getCompletedTopicIds(): string[] {
    return [...this._completedTopicIds];
  }

  public getPlannedMinutes(): number {
    return this._plannedMinutes;
  }

  public setPlannedMinutes(minutes: number): void {
    this._plannedMinutes = requireNumberInRange(minutes, 'plannedMinutes', 0, 1440);
  }

  public containsTopic(topicId: string): boolean {
    return this._topicIds.includes(topicId);
  }

  public addTopic(topicId: string, estimatedMinutes = 0): boolean {
    const id = requireNonEmpty(topicId, 'topicId');
    if (this._topicIds.includes(id)) {
      return false;
    }
    this._topicIds.push(id);
    this._plannedMinutes = requireNumberInRange(
      Math.min(1440, this._plannedMinutes + Math.max(0, estimatedMinutes)),
      'plannedMinutes',
      0,
      1440,
    );
    return true;
  }

  public markTopicComplete(topicId: string): boolean {
    if (!this._topicIds.includes(topicId) || this._completedTopicIds.includes(topicId)) {
      return false;
    }
    this._completedTopicIds.push(topicId);
    return true;
  }

  public unmarkTopicComplete(topicId: string): boolean {
    const before = this._completedTopicIds.length;
    this._completedTopicIds = this._completedTopicIds.filter((id) => id !== topicId);
    return this._completedTopicIds.length !== before;
  }

  public removeTopic(topicId: string): boolean {
    const before = this._topicIds.length;
    this._topicIds = this._topicIds.filter((id) => id !== topicId);
    this._completedTopicIds = this._completedTopicIds.filter((id) => id !== topicId);
    return this._topicIds.length !== before;
  }

  public isComplete(): boolean {
    return (
      this._topicIds.length > 0 &&
      this._topicIds.every((topicId) => this._completedTopicIds.includes(topicId))
    );
  }

  public getProgress(): number {
    if (this._topicIds.length === 0) {
      return 0;
    }
    return roundTo((this._completedTopicIds.length / this._topicIds.length) * 100);
  }
}
