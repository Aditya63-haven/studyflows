import { Request, Response } from 'express';
import { QuizAnswer } from '../domain/interfaces/IGradable';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  CreateQuizInput,
  QuizService,
  UpdateQuizInput,
} from '../services/QuizService';
import { authContext } from '../utils/authContext';
import { Serializer } from '../utils/serializers';

interface SubmitQuizBody {
  answers: QuizAnswer[];
}

/**
 * HTTP adapter for quiz use cases.
 */
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  public listBySpace = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const quizzes = await this.quizService.listBySpace(userId, req.params.spaceId);
    res.status(200).json({ quizzes: quizzes.map((quiz) => Serializer.quiz(quiz)) });
  });

  public create = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const quiz = await this.quizService.create(
      userId,
      req.params.spaceId,
      req.body as CreateQuizInput,
    );
    res.status(201).json({ quiz: Serializer.quiz(quiz) });
  });

  public get = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const quiz = await this.quizService.getOwned(userId, req.params.id);
    res.status(200).json({ quiz: Serializer.quiz(quiz) });
  });

  public update = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const quiz = await this.quizService.update(
      userId,
      req.params.id,
      req.body as UpdateQuizInput,
    );
    res.status(200).json({ quiz: Serializer.quiz(quiz) });
  });

  public delete = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    await this.quizService.delete(userId, req.params.id);
    res.status(204).send();
  });

  public take = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const { answers } = req.body as SubmitQuizBody;
    const attempt = await this.quizService.take(userId, req.params.id, answers);
    res.status(201).json({ attempt: Serializer.attempt(attempt) });
  });

  public attempts = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const attempts = await this.quizService.listAttempts(userId, req.params.id);
    res.status(200).json({ attempts: attempts.map(Serializer.attempt) });
  });

  public generateFromNote = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const quiz = await this.quizService.generateFromNote(userId, req.params.id);
    res.status(201).json({ quiz: Serializer.quiz(quiz) });
  });
}
