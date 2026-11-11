import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  CreateStudySessionInput,
  StudySessionService,
} from '../services/StudySessionService';
import { authContext } from '../utils/authContext';
import { Serializer } from '../utils/serializers';

/**
 * HTTP adapter for study session use cases.
 */
export class StudySessionController {
  constructor(private readonly sessionService: StudySessionService) {}

  public list = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const sessions = await this.sessionService.list(userId);
    res.status(200).json({ sessions: sessions.map(Serializer.session) });
  });

  public create = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const session = await this.sessionService.create(
      userId,
      req.body as CreateStudySessionInput,
    );
    res.status(201).json({ session: Serializer.session(session) });
  });
}
