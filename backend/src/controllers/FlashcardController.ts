import { Request, Response } from 'express';
import { ReviewRating } from '../domain/interfaces/IRevisionStrategy';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  CreateDeckInput,
  FlashcardService,
  UpdateDeckInput,
} from '../services/FlashcardService';
import { authContext } from '../utils/authContext';
import { Serializer } from '../utils/serializers';

interface ReviewCardBody {
  rating: ReviewRating;
}

/**
 * HTTP adapter for flashcard deck use cases.
 */
export class FlashcardController {
  constructor(private readonly flashcardService: FlashcardService) {}

  public listBySpace = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const decks = await this.flashcardService.listBySpace(userId, req.params.spaceId);
    res.status(200).json({ decks: decks.map(Serializer.deck) });
  });

  public create = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const deck = await this.flashcardService.create(
      userId,
      req.params.spaceId,
      req.body as CreateDeckInput,
    );
    res.status(201).json({ deck: Serializer.deck(deck) });
  });

  public get = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const deck = await this.flashcardService.getOwned(userId, req.params.id);
    res.status(200).json({ deck: Serializer.deck(deck) });
  });

  public update = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const deck = await this.flashcardService.update(
      userId,
      req.params.id,
      req.body as UpdateDeckInput,
    );
    res.status(200).json({ deck: Serializer.deck(deck) });
  });

  public delete = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    await this.flashcardService.delete(userId, req.params.id);
    res.status(204).send();
  });

  public reviewCard = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const { rating } = req.body as ReviewCardBody;
    const deck = await this.flashcardService.reviewCard(
      userId,
      req.params.id,
      req.params.cardId,
      rating,
    );
    res.status(200).json({ deck: Serializer.deck(deck) });
  });
}
