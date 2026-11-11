import { ValidationError } from '../../errors';
import {
  requireDate,
  requireNonEmpty,
  requireNumberInRange,
  resolveId,
  roundTo,
} from '../base/helpers';
import { StudyDay } from './StudyDay';
import { Topic } from './Topic';

export interface ExamPlanProps {
  id?: string;
  name: string;
  ownerId: string;
  examDate: Date;
  dailyStudyHours: number;
  topics?: Topic[];
  studyDays?: StudyDay[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Day-by-day plan for an exam.
 *
 * OOP: Aggregation - ExamPlan aggregates Topics that can exist independently.
 * OOP: Composition - ExamPlan owns its StudyDays.
 * OOP: Association - belongs to a User through `ownerId`.
 */
export class ExamPlan {
  private readonly _id: string;
  private _name: string;
  private readonly _ownerId: string;
  private _examDate: Date;
  private _dailyStudyHours: number;
  private _topics: Topic[];
  private _studyDays: StudyDay[];
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: ExamPlanProps) {
    this._id = resolveId(props.id);
    this._name = requireNonEmpty(props.name, 'name');
    this._ownerId = requireNonEmpty(props.ownerId, 'ownerId');
    this._examDate = requireDate(props.examDate, 'examDate');
    this._dailyStudyHours = requireNumberInRange(
      props.dailyStudyHours,
      'dailyStudyHours',
      0.5,
      24,
    );
    this._topics = [...(props.topics ?? [])];
    this._studyDays = [...(props.studyDays ?? [])];
    this._createdAt = props.createdAt ? requireDate(props.createdAt, 'createdAt') : new Date();
    this._updatedAt = props.updatedAt ? requireDate(props.updatedAt, 'updatedAt') : new Date();
  }

  public getId(): string {
    return this._id;
  }

  public getName(): string {
    return this._name;
  }

  public setName(name: string): void {
    this._name = requireNonEmpty(name, 'name');
    this.touch();
  }

  public getOwnerId(): string {
    return this._ownerId;
  }

  public getExamDate(): Date {
    return new Date(this._examDate.getTime());
  }

  public setExamDate(examDate: Date): void {
    this._examDate = requireDate(examDate, 'examDate');
    this.touch();
  }

  public getDailyStudyHours(): number {
    return this._dailyStudyHours;
  }

  public setDailyStudyHours(hours: number): void {
    this._dailyStudyHours = requireNumberInRange(hours, 'dailyStudyHours', 0.5, 24);
    this.touch();
  }

  public getTopics(): Topic[] {
    return [...this._topics];
  }

  public addTopic(topic: Topic): void {
    if (!(topic instanceof Topic)) {
      throw new ValidationError('topic must be a Topic instance');
    }
    if (this._topics.some((existing) => existing.getId() === topic.getId())) {
      throw new ValidationError(`Duplicate topic id: ${topic.getId()}`);
    }
    this._topics.push(topic);
    this.touch();
  }

  public removeTopic(topicId: string): boolean {
    const before = this._topics.length;
    this._topics = this._topics.filter((topic) => topic.getId() !== topicId);
    if (this._topics.length === before) {
      return false;
    }
    for (const day of this._studyDays) {
      day.removeTopic(topicId);
    }
    this.touch();
    return true;
  }

  public getStudyDays(): StudyDay[] {
    return [...this._studyDays];
  }

  public setStudyDays(studyDays: StudyDay[]): void {
    if (!Array.isArray(studyDays)) {
      throw new ValidationError('studyDays must be an array');
    }
    this._studyDays = [...studyDays];
    this.touch();
  }

  public addStudyDay(day: StudyDay): void {
    if (!(day instanceof StudyDay)) {
      throw new ValidationError('day must be a StudyDay instance');
    }
    this._studyDays.push(day);
    this.touch();
  }

  /**
   * Marks a topic complete on a specific day, or the first day containing it.
   */
  public markTopicComplete(topicId: string, dayId?: string): boolean {
    const day = dayId
      ? this._studyDays.find((candidate) => candidate.getId() === dayId)
      : this._studyDays.find((candidate) => candidate.containsTopic(topicId));

    if (!day) {
      return false;
    }

    const marked = day.markTopicComplete(topicId);
    if (marked) {
      this.touch();
    }
    return marked;
  }

  public getProgress(): number {
    const plannedTopicIds = new Set(
      this._studyDays.flatMap((day) => day.getTopicIds()).filter(Boolean),
    );
    const totalTopics =
      plannedTopicIds.size > 0 ? plannedTopicIds : new Set(this._topics.map((topic) => topic.getId()));

    if (totalTopics.size === 0) {
      return 0;
    }

    const completed = new Set(
      this._studyDays.flatMap((day) => day.getCompletedTopicIds()).filter(Boolean),
    );
    return roundTo((completed.size / totalTopics.size) * 100);
  }

  public getDaysRemaining(now: Date = new Date()): number {
    const difference = this._examDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(difference / (24 * 60 * 60 * 1000)));
  }

  public getCreatedAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  public getUpdatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  private touch(): void {
    this._updatedAt = new Date();
  }
}
