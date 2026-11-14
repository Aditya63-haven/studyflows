import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { AiAccessService } from '../services/AiAccessService';
import { authContext } from '../utils/authContext';

/**
 * HTTP adapter for invite-only AI access administration.
 */
export class AiAccessController {
  constructor(private readonly aiAccessService: AiAccessService) {}

  public status = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const status = await this.aiAccessService.getStatus(userId);
    res.status(200).json({ status });
  });

  public list = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const grants = await this.aiAccessService.listGrants(userId);
    res.status(200).json({ grants });
  });

  public grant = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const grant = await this.aiAccessService.grantAccess(userId, req.body.email);
    res.status(201).json({ grant });
  });

  public revoke = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const grant = await this.aiAccessService.revokeAccess(userId, req.params.id);
    res.status(200).json({ grant });
  });
}
