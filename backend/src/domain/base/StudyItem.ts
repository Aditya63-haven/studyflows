import { IShareable } from '../interfaces/IShareable';
import { requireDate, resolveId, requireNonEmpty } from './helpers';

export type StudyItemType = 'note' | 'quiz' | 'flashcarddeck';

export interface StudyItemProps {
  id?: string;
  title: string;
  ownerId: string;
  createdAt?: Date;
  updatedAt?: Date;
  shareToken?: string | null;
}

/**
 * Common base for notes, quizzes and flashcard decks.
 *
 * OOP: Abstraction - defines shared state and requires subclasses to implement
 * their own `summary()` and `itemType`.
 * OOP: Inheritance - Note, Quiz and FlashcardDeck extend this class.
 * OOP: Encapsulation - all state is private and accessed through validated methods.
 * OOP: Association - each study item is owned by a User through `ownerId`.
 */
export abstract class StudyItem implements IShareable {
  private _id: string;
  private _title: string;
  private _ownerId: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _shareToken: string | null;

  constructor(props: StudyItemProps) {
    this._id = resolveId(props.id);
    this._title = requireNonEmpty(props.title, 'title');
    this._ownerId = requireNonEmpty(props.ownerId, 'ownerId');
    this._createdAt = props.createdAt ? requireDate(props.createdAt, 'createdAt') : new Date();
    this._updatedAt = props.updatedAt ? requireDate(props.updatedAt, 'updatedAt') : new Date(this._createdAt);
    this._shareToken = props.shareToken ? requireNonEmpty(props.shareToken, 'shareToken') : null;
  }

  public getId(): string {
    return this._id;
  }

  public getTitle(): string {
    return this._title;
  }

  public setTitle(title: string): void {
    this._title = requireNonEmpty(title, 'title');
    this.touch();
  }

  public getOwnerId(): string {
    return this._ownerId;
  }

  public getCreatedAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  public getUpdatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  public touch(): void {
    this._updatedAt = new Date();
  }

  public getShareToken(): string | null {
    return this._shareToken;
  }

  public makeShareable(token: string): void {
    this._shareToken = requireNonEmpty(token, 'shareToken');
    this.touch();
  }

  public revokeSharing(): void {
    this._shareToken = null;
    this.touch();
  }

  public isShared(): boolean {
    return this._shareToken !== null;
  }

  public abstract get itemType(): StudyItemType;

  /**
   * Each study item produces its own human-readable summary.
   *
   * OOP: Polymorphism - summary() is overridden by Note, Quiz and FlashcardDeck.
   */
  public abstract summary(): string;
}
