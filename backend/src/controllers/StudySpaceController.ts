import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  CreateStudySpaceInput,
  StudySpaceService,
  UpdateStudySpaceInput,
} from '../services/StudySpaceService';
import { authContext } from '../utils/authContext';
import { Serializer } from '../utils/serializers';

/**
 * HTTP adapter for study space use cases.
 */
export class StudySpaceController {
  constructor(private readonly spaceService: StudySpaceService) {}

  public list = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const spaces = await this.spaceService.list(userId);
    res.status(200).json({ spaces: spaces.map(Serializer.space) });
  });

  public create = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const space = await this.spaceService.create(
      userId,
      req.body as CreateStudySpaceInput,
    );
    res.status(201).json({ space: Serializer.space(space) });
  });

  public get = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const space = await this.spaceService.getOwned(userId, req.params.id);
    res.status(200).json({ space: Serializer.space(space) });
  });

  public update = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const space = await this.spaceService.update(
      userId,
      req.params.id,
      req.body as UpdateStudySpaceInput,
    );
    res.status(200).json({ space: Serializer.space(space) });
  });

  public delete = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    await this.spaceService.delete(userId, req.params.id);
    res.status(204).send();
  });
}
