import { requireNonEmpty, requireNumberInRange, requireString, resolveId } from '../base/helpers';

export interface TopicProps {
  id?: string;
  name: string;
  description?: string;
  estimatedMinutes?: number;
}

/**
 * A study topic that can be aggregated by exam plans and tracked by revision.
 *
 * OOP: Classes and objects - encapsulates a topic's identity and study estimate.
 */
export class Topic {
  private readonly _id: string;
  private _name: string;
  private _description: string;
  private _estimatedMinutes: number;

  constructor(props: TopicProps) {
    this._id = resolveId(props.id);
    this._name = requireNonEmpty(props.name, 'name');
    this._description = requireString(props.description ?? '', 'description');
    this._estimatedMinutes = requireNumberInRange(
      props.estimatedMinutes ?? 30,
      'estimatedMinutes',
      1,
      1440,
    );
  }

  public getId(): string {
    return this._id;
  }

  public getName(): string {
    return this._name;
  }

  public setName(name: string): void {
    this._name = requireNonEmpty(name, 'name');
  }

  public getDescription(): string {
    return this._description;
  }

  public setDescription(description: string): void {
    this._description = requireString(description, 'description');
  }

  public getEstimatedMinutes(): number {
    return this._estimatedMinutes;
  }

  public setEstimatedMinutes(minutes: number): void {
    this._estimatedMinutes = requireNumberInRange(minutes, 'estimatedMinutes', 1, 1440);
  }
}
