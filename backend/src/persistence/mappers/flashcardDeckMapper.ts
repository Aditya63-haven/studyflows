import { Flashcard } from '../../domain/entities/Flashcard';
import { FlashcardDeck } from '../../domain/entities/FlashcardDeck';
import { FlashcardDeckDocument } from '../schemas/flashcardDeck.schema';

export class FlashcardDeckMapper {
  public static toDomain(document: FlashcardDeckDocument): FlashcardDeck {
    return new FlashcardDeck({
      id: document._id,
      ownerId: document.owner,
      spaceId: document.space,
      title: document.title,
      description: document.description,
      cards: document.cards.map(
        (card) =>
          new Flashcard({
            id: card._id,
            front: card.front,
            back: card.back,
            easeFactor: card.easeFactor,
            intervalDays: card.intervalDays,
            reviewCount: card.reviewCount,
            lastReviewedAt: card.lastReviewedAt,
            nextReviewAt: card.nextReviewAt,
          }),
      ),
      shareToken: document.shareToken,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }

  public static toPersistence(deck: FlashcardDeck): FlashcardDeckDocument {
    return {
      _id: deck.getId(),
      owner: deck.getOwnerId(),
      space: deck.getSpaceId(),
      title: deck.getTitle(),
      description: deck.getDescription(),
      cards: deck.getCards().map((card) => ({
        _id: card.getId(),
        front: card.getFront(),
        back: card.getBack(),
        easeFactor: card.getEaseFactor(),
        intervalDays: card.getIntervalDays(),
        reviewCount: card.getReviewCount(),
        lastReviewedAt: card.getLastReviewedAt(),
        nextReviewAt: card.getNextReviewAt(),
      })),
      shareToken: deck.getShareToken(),
      createdAt: deck.getCreatedAt(),
      updatedAt: deck.getUpdatedAt(),
    };
  }
}
