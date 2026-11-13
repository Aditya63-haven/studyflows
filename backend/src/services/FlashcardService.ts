import { ForbiddenError, NotFoundError } from '../errors';
import { Flashcard } from '../domain/entities/Flashcard';
import { FlashcardDeck } from '../domain/entities/FlashcardDeck';
import { ReviewRating } from '../domain/interfaces/IRevisionStrategy';
import { IRevisionStrategy } from '../domain/interfaces/IRevisionStrategy';
import { BookmarkRepository } from '../repositories/BookmarkRepository';
import { FlashcardDeckRepository } from '../repositories/FlashcardDeckRepository';
import { StudySpaceRepository } from '../repositories/StudySpaceRepository';

export interface FlashcardInput {
  id?: string;
  front: string;
  back: string;
}

export interface CreateDeckInput {
  title: string;
  description?: string;
  cards?: FlashcardInput[];
}

export interface UpdateDeckInput {
  title?: string;
  description?: string;
  cards?: FlashcardInput[];
}

/**
 * Flashcard deck use cases.
 *
 * OOP: Strategy - card reviews are scheduled by an injected IRevisionStrategy.
 * OOP: Composition - cards live inside the deck and are manipulated through it.
 */
export class FlashcardService {
  constructor(
    private readonly deckRepository: FlashcardDeckRepository,
    private readonly spaceRepository: StudySpaceRepository,
    private readonly revisionStrategy: IRevisionStrategy,
    private readonly bookmarkRepository: BookmarkRepository,
  ) {}

  public async listBySpace(ownerId: string, spaceId: string): Promise<FlashcardDeck[]> {
    await this.ensureSpaceOwned(ownerId, spaceId);
    return this.deckRepository.findBySpace(spaceId);
  }

  public async create(ownerId: string, spaceId: string, input: CreateDeckInput): Promise<FlashcardDeck> {
    await this.ensureSpaceOwned(ownerId, spaceId);
    const deck = new FlashcardDeck({
      ownerId,
      spaceId,
      title: input.title,
      description: input.description,
      cards: (input.cards ?? []).map((card) => new Flashcard(card)),
    });
    return this.deckRepository.create(deck);
  }

  public async getOwned(ownerId: string, deckId: string): Promise<FlashcardDeck> {
    const deck = await this.deckRepository.findById(deckId);
    if (!deck) {
      throw new NotFoundError('Flashcard deck not found');
    }
    if (deck.getOwnerId() !== ownerId) {
      throw new ForbiddenError('You do not own this flashcard deck');
    }
    return deck;
  }

  public async update(
    ownerId: string,
    deckId: string,
    input: UpdateDeckInput,
  ): Promise<FlashcardDeck> {
    const deck = await this.getOwned(ownerId, deckId);
    if (input.title !== undefined) {
      deck.setTitle(input.title);
    }
    if (input.description !== undefined) {
      deck.setDescription(input.description);
    }
    if (input.cards !== undefined) {
      deck.setCards(this.mergeCards(deck, input.cards));
    }

    const updated = await this.deckRepository.update(deckId, deck);
    if (!updated) {
      throw new NotFoundError('Flashcard deck not found');
    }
    return updated;
  }

  public async delete(ownerId: string, deckId: string): Promise<void> {
    await this.getOwned(ownerId, deckId);
    await this.bookmarkRepository.deleteByItem(deckId, 'flashcarddeck');
    const deleted = await this.deckRepository.delete(deckId);
    if (!deleted) {
      throw new NotFoundError('Flashcard deck not found');
    }
  }

  public async reviewCard(
    ownerId: string,
    deckId: string,
    cardId: string,
    rating: ReviewRating,
  ): Promise<FlashcardDeck> {
    const deck = await this.getOwned(ownerId, deckId);
    const card = deck.getCards().find((candidate) => candidate.getId() === cardId);
    if (!card) {
      throw new NotFoundError('Flashcard not found');
    }

    const now = new Date();
    const state = {
      memoryStrength: Math.min(100, card.getReviewCount() * 20),
      easeFactor: card.getEaseFactor(),
      intervalDays: card.getIntervalDays(),
      reviewCount: card.getReviewCount(),
      lastReviewedAt: card.getLastReviewedAt(),
    };
    const result = this.revisionStrategy.calculateNextReview(state, rating, now);
    card.applySchedule(
      result.easeFactor,
      result.intervalDays,
      result.nextReviewAt,
      result.lastReviewedAt ?? now,
    );

    const updated = await this.deckRepository.update(deckId, deck);
    if (!updated) {
      throw new NotFoundError('Flashcard deck not found');
    }
    return updated;
  }

  private mergeCards(deck: FlashcardDeck, cards: FlashcardInput[]): Flashcard[] {
    const existing = new Map(deck.getCards().map((card) => [card.getId(), card]));
    return cards.map((input) => {
      if (input.id && existing.has(input.id)) {
        const card = existing.get(input.id) as Flashcard;
        card.setFront(input.front);
        card.setBack(input.back);
        return card;
      }
      return new Flashcard(input);
    });
  }

  private async ensureSpaceOwned(ownerId: string, spaceId: string): Promise<void> {
    const space = await this.spaceRepository.findById(spaceId);
    if (!space) {
      throw new NotFoundError('Study space not found');
    }
    if (space.getOwnerId() !== ownerId) {
      throw new ForbiddenError('You do not own this study space');
    }
  }
}
