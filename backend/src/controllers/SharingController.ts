import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { SharingService } from '../services/SharingService';
import { authContext } from '../utils/authContext';
import { Serializer } from '../utils/serializers';
import { QuizAnswer } from '../domain/interfaces/IGradable';

interface SubmitQuizBody {
  answers: QuizAnswer[];
}

/**
 * HTTP adapter for public sharing use cases.
 */
export class SharingController {
  constructor(private readonly sharingService: SharingService) {}

  public shareNote = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const link = await this.sharingService.shareNote(userId, req.params.id);
    res.status(201).json({ share: Serializer.sharedLink(link) });
  });

  public shareQuiz = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const link = await this.sharingService.shareQuiz(userId, req.params.id);
    res.status(201).json({ share: Serializer.sharedLink(link) });
  });

  public revoke = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    await this.sharingService.revoke(userId, req.params.token);
    res.status(204).send();
  });

  public publicNote = asyncHandler(async (req: Request, res: Response) => {
    const note = await this.sharingService.getPublicNote(req.params.token);
    res.status(200).json({ note: Serializer.note(note) });
  });

  public publicQuiz = asyncHandler(async (req: Request, res: Response) => {
    const quiz = await this.sharingService.getPublicQuiz(req.params.token);
    res.status(200).json({ quiz: Serializer.quiz(quiz, false) });
  });

  public attemptPublicQuiz = asyncHandler(async (req: Request, res: Response) => {
    const { answers } = req.body as SubmitQuizBody;
    const result = await this.sharingService.attemptPublicQuiz(
      req.params.token,
      answers,
    );
    res.status(200).json({ result });
  });
}
