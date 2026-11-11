import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  BookmarkService,
  CreateBookmarkInput,
} from '../services/BookmarkService';
import { authContext } from '../utils/authContext';

/**
 * HTTP adapter for bookmark use cases.
 */
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  public list = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const bookmarks = await this.bookmarkService.list(userId);
    res.status(200).json({ bookmarks });
  });

  public create = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const bookmark = await this.bookmarkService.create(
      userId,
      req.body as CreateBookmarkInput,
    );
    res.status(201).json({ bookmark });
  });

  public delete = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    await this.bookmarkService.delete(userId, req.params.id);
    res.status(204).send();
  });
}
