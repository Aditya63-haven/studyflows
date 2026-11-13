import { Request, Response } from 'express';
import { NotFoundError, ValidationError } from '../errors';
import { asyncHandler } from '../middleware/asyncHandler';
import { AvatarService } from '../services/AvatarService';
import { authContext } from '../utils/authContext';
import { Serializer } from '../utils/serializers';

/**
 * HTTP adapter for authenticated avatar upload/removal and public retrieval.
 */
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  public upload = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    if (!req.file) {
      throw new ValidationError('Profile picture is required');
    }

    const user = await this.avatarService.uploadAvatar(userId, req.file.buffer);
    res.status(200).json({ user: Serializer.user(user) });
  });

  public remove = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const user = await this.avatarService.removeAvatar(userId);
    res.status(200).json({ user: Serializer.user(user) });
  });

  public get = asyncHandler(async (req: Request, res: Response, next) => {
    const result = await this.avatarService.readAvatar(req.params.key);
    if (!result) {
      throw new NotFoundError('Profile picture not found');
    }

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Content-Length', String(result.size));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    result.stream.on('error', next);
    result.stream.pipe(res);
  });
}
