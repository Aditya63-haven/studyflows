import { resolveId } from '../base/helpers';
import { DomainEventType } from '../../patterns/observer/events';

export type NotificationType = DomainEventType;

export interface NotificationProps {
  id?: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read?: boolean;
  dedupeKey?: string | null;
  createdAt?: Date;
}

/**
 * A notification shown to a user in the app header.
 *
 * OOP: Association - belongs to a User through `userId`.
 * OOP: Encapsulation - read state can only change through `markRead()`.
 */
export class Notification {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _type: NotificationType;
  private readonly _title: string;
  private readonly _message: string;
  private _read: boolean;
  private readonly _dedupeKey: string | null;
  private readonly _createdAt: Date;

  constructor(props: NotificationProps) {
    this._id = resolveId(props.id);
    this._userId = props.userId;
    this._type = props.type;
    this._title = props.title;
    this._message = props.message;
    this._read = props.read ?? false;
    this._dedupeKey = props.dedupeKey ?? null;
    this._createdAt = props.createdAt ?? new Date();
  }

  public getId(): string {
    return this._id;
  }

  public getUserId(): string {
    return this._userId;
  }

  public getType(): NotificationType {
    return this._type;
  }

  public getTitle(): string {
    return this._title;
  }

  public getMessage(): string {
    return this._message;
  }

  public isRead(): boolean {
    return this._read;
  }

  public markRead(): void {
    this._read = true;
  }

  public getDedupeKey(): string | null {
    return this._dedupeKey;
  }

  public getCreatedAt(): Date {
    return new Date(this._createdAt.getTime());
  }
}
