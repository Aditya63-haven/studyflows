import { ValidationError } from '../../errors';
import { StudyItem, StudyItemProps, StudyItemType } from '../base/StudyItem';
import { requireNonEmpty, requireString } from '../base/helpers';
import { Flashcard } from './Flashcard';

export interface FlashcardDeckProps extends StudyItemProps {
  spaceId: string;
  description?: string;
  cards?: Flashcard[];
}

/**
 * Deck of flashcards.
 *
 * OOP: Inheritance - FlashcardDeck is a StudyItem.
 * OOP: Composition - the deck owns its flashcards; cards are added/removed
 * through the deck.
 * OOP: Aggregation - a StudySpace aggregates decks.
 */
export class FlashcardDeck extends StudyItem {
  private _spaceId: string;
  private _description: string;
  private _cards: Flashcard[];

  constructor(props: FlashcardDeckProps) {
    super(props);
    this._spaceId = requireNonEmpty(props.spaceId, 'spaceId');
    this._description = requireString(props.description ?? '', 'description');
    this._cards = [];
    this.setCards(props.cards ?? []);
  }

  public get itemType(): StudyItemType {
    return 'flashcarddeck';
  }

  public getSpaceId(): string {
    return this._spaceId;
  }

  public setSpaceId(spaceId: string): void {
    this._spaceId = requireNonEmpty(spaceId, 'spaceId');
    this.touch();
  }

  public getDescription(): string {
    return this._description;
  }

  public setDescription(description: string): void {
    this._description = requireString(description, 'description');
    this.touch();
  }

  public getCards(): Flashcard[] {
    return [...this._cards];
  }

  public setCards(cards: Flashcard[]): void {
    if (!Array.isArray(cards)) {
      throw new ValidationError('cards must be an array');
    }

    const ids = new Set<string>();
    for (const card of cards) {
      if (!(card instanceof Flashcard)) {
        throw new ValidationError('every card must be a Flashcard instance');
      }
      if (ids.has(card.getId())) {
        throw new ValidationError(`Duplicate flashcard id: ${card.getId()}`);
      }
      ids.add(card.getId());
    }

    this._cards = [...cards];
    this.touch();
  }

  public addCard(card: Flashcard): void {
    if (this._cards.some((existing) => existing.getId() === card.getId())) {
      throw new ValidationError(`Duplicate flashcard id: ${card.getId()}`);
    }
    this._cards.push(card);
    this.touch();
  }

  public removeCard(cardId: string): boolean {
    const before = this._cards.length;
    this._cards = this._cards.filter((card) => card.getId() !== cardId);
    const removed = this._cards.length !== before;
    if (removed) {
      this.touch();
    }
    return removed;
  }

  /**
   * Returns a shuffled copy without mutating the owned deck.
   */
  public shuffle(random: () => number = Math.random): Flashcard[] {
    const shuffled = [...this._cards];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  /**
   * OOP: Polymorphism - FlashcardDeck overrides StudyItem.summary().
   */
  public summary(): string {
    return `${this._cards.length} flashcards`;
  }
}
