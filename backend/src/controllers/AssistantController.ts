import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { AssistantService } from '../services/AssistantService';
import { authContext } from '../utils/authContext';
import { Serializer } from '../utils/serializers';

/**
 * HTTP adapter for the study assistant command bar.
 */
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  public command = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const proposal = await this.assistantService.propose(userId, req.body.text);
    res.status(200).json({ proposal: Serializer.assistantProposal(proposal) });
  });

  public apply = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const { plan, applied } = await this.assistantService.apply(
      userId,
      req.body.planId,
      req.body.strategy,
    );
    res.status(200).json({
      examPlan: Serializer.examPlan(plan),
      applied: Serializer.appliedChange(applied),
    });
  });
}
