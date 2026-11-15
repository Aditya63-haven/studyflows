import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  AssistantChatInput,
  AssistantService,
} from '../services/AssistantService';
import { PerformanceFilters } from '../services/PerformanceAnalysisService';
import { authContext } from '../utils/authContext';
import { Serializer } from '../utils/serializers';

/**
 * HTTP adapter for the study assistant command bar.
 */
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  public chat = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const result = await this.assistantService.chat(
      userId,
      req.body as AssistantChatInput,
    );
    res.status(200).json({ result });
  });

  public performance = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const result = await this.assistantService.analyzePerformance(
      userId,
      req.body as PerformanceFilters,
    );
    res.status(200).json({ result });
  });

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
