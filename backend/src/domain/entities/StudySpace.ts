import { ValidationError } from '../../errors';
import { requireDate, requireNonEmpty, requireString, resolveId } from '../base/helpers';
import { FlashcardDeck } from './FlashcardDeck';
import { Note } from './Note';
import { Quiz } from './Quiz';

export interface StudySpaceProps {
  id?: string;
  ownerId: string;
  name: string;
  subject: string;
  description?: string;
  color?: string;
  notes?: Note[];
  quizzes?: Quiz[];
  decks?: FlashcardDeck[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Subject workspace that groups notes, quizzes and flashcard decks.
 *
 * OOP: Association - a StudySpace belongs to a User through `ownerId`.
 * OOP: Aggregation - it aggregates Notes, Quizzes and FlashcardDecks; those
 * objects can exist independently of the space.
 */
export class StudySpace {
  private readonly _id: string;
  private readonly _ownerId: string;
  private _name: string;
  private _subject: string;
  private _description: string;
  private _color: string;
  private _notes: Note[];
  private _quizzes: Quiz[];
  private _decks: FlashcardDeck[];
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: StudySpaceProps) {
    this._id = resolveId(props.id);
    this._ownerId = requireNonEmpty(props.ownerId, 'ownerId');
    this._name = requireNonEmpty(props.name, 'name');
    this._subject = requireNonEmpty(props.subject, 'subject');
    this._description = requireString(props.description ?? '', 'description');
    this._color = requireString(props.color ?? '#6366f1', 'color');
    this._createdAt = props.createdAt ? requireDate(props.createdAt, 'createdAt') : new Date();
    this._updatedAt = props.updatedAt ? requireDate(props.updatedAt, 'updatedAt') : new Date();
    this._notes = [];
    this._quizzes = [];
    this._decks = [];
    for (const note of props.notes ?? []) {
      this.addNote(note);
    }
    for (const quiz of props.quizzes ?? []) {
      this.addQuiz(quiz);
    }
    for (const deck of props.decks ?? []) {
      this.addDeck(deck);
    }
  }

  public getId(): string {
    return this._id;
  }

  public getOwnerId(): string {
    return this._ownerId;
  }

  public getName(): string {
    return this._name;
  }

  public setName(name: string): void {
    this._name = requireNonEmpty(name, 'name');
    this.touch();
  }

  public getSubject(): string {
    return this._subject;
  }

  public setSubject(subject: string): void {
    this._subject = requireNonEmpty(subject, 'subject');
    this.touch();
  }

  public getDescription(): string {
    return this._description;
  }

  public setDescription(description: string): void {
    this._description = requireString(description, 'description');
    this.touch();
  }

  public getColor(): string {
    return this._color;
  }

  public setColor(color: string): void {
    this._color = requireString(color, 'color', false);
    this.touch();
  }

  public getNotes(): Note[] {
    return [...this._notes];
  }

  public addNote(note: Note): void {
    if (!(note instanceof Note)) {
      throw new ValidationError('note must be a Note instance');
    }
    if (note.getSpaceId() !== this._id) {
      throw new ValidationError('note does not belong to this study space');
    }
    if (this._notes.some((existing) => existing.getId() === note.getId())) {
      throw new ValidationError(`Duplicate note id: ${note.getId()}`);
    }
    this._notes.push(note);
    this.touch();
  }

  public removeNote(noteId: string): boolean {
    const before = this._notes.length;
    this._notes = this._notes.filter((note) => note.getId() !== noteId);
    return this.changed(before, this._notes.length);
  }

  public getQuizzes(): Quiz[] {
    return [...this._quizzes];
  }

  public addQuiz(quiz: Quiz): void {
    if (!(quiz instanceof Quiz)) {
      throw new ValidationError('quiz must be a Quiz instance');
    }
    if (quiz.getSpaceId() !== this._id) {
      throw new ValidationError('quiz does not belong to this study space');
    }
    if (this._quizzes.some((existing) => existing.getId() === quiz.getId())) {
      throw new ValidationError(`Duplicate quiz id: ${quiz.getId()}`);
    }
    this._quizzes.push(quiz);
    this.touch();
  }

  public removeQuiz(quizId: string): boolean {
    const before = this._quizzes.length;
    this._quizzes = this._quizzes.filter((quiz) => quiz.getId() !== quizId);
    return this.changed(before, this._quizzes.length);
  }

  public getDecks(): FlashcardDeck[] {
    return [...this._decks];
  }

  public addDeck(deck: FlashcardDeck): void {
    if (!(deck instanceof FlashcardDeck)) {
      throw new ValidationError('deck must be a FlashcardDeck instance');
    }
    if (deck.getSpaceId() !== this._id) {
      throw new ValidationError('deck does not belong to this study space');
    }
    if (this._decks.some((existing) => existing.getId() === deck.getId())) {
      throw new ValidationError(`Duplicate deck id: ${deck.getId()}`);
    }
    this._decks.push(deck);
    this.touch();
  }

  public removeDeck(deckId: string): boolean {
    const before = this._decks.length;
    this._decks = this._decks.filter((deck) => deck.getId() !== deckId);
    return this.changed(before, this._decks.length);
  }

  public getCreatedAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  public getUpdatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  /**
   * Human-readable snapshot of the aggregated content.
   */
  public summary(): string {
    return `${this._notes.length} notes, ${this._quizzes.length} quizzes, ${this._decks.length} decks`;
  }

  private changed(before: number, after: number): boolean {
    const didChange = before !== after;
    if (didChange) {
      this.touch();
    }
    return didChange;
  }

  private touch(): void {
    this._updatedAt = new Date();
  }
}
