import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { RescheduleStrategyName } from '../domain/interfaces/IRescheduleStrategy';
import { AttentionService } from '../services/AttentionService';
import { authContext } from '../utils/authContext';
import { Serializer } from '../utils/serializers';

/**
 * HTTP adapter for the "needs attention" use cases.
 */
export class AttentionController {
  constructor(private readonly attentionService: AttentionService) {}

  public report = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const report = await this.attentionService.report(userId);
    res.status(200).json({ attention: Serializer.attentionReport(report) });
  });

  public apply = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const { plan, applied } = await this.attentionService.apply(
      userId,
      req.params.id,
      req.body.strategy as RescheduleStrategyName,
    );
    res.status(200).json({
      examPlan: Serializer.examPlan(plan),
      applied: Serializer.appliedChange(applied),
    });
  });
}
