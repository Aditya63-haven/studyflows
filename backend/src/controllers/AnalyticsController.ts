import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { AnalyticsService } from '../services/AnalyticsService';
import {
  PerformanceAnalysisService,
  PerformanceFilters,
} from '../services/PerformanceAnalysisService';
import { Serializer } from '../utils/serializers';
import { authContext } from '../utils/authContext';

/**
 * HTTP adapter for analytics use cases.
 */
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly performanceService: PerformanceAnalysisService,
  ) {}

  public overview = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const overview = await this.analyticsService.getOverview(userId);
    res.status(200).json({ analytics: overview });
  });

  public performance = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const report = await this.performanceService.analyze(
      userId,
      req.query as PerformanceFilters,
    );
    res.status(200).json({ report });
  });

  public acceptRecommendation = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const { schedule, created } = await this.performanceService.acceptRecommendation(
      userId,
      req.params.id,
      req.query as PerformanceFilters,
    );
    res.status(200).json({
      schedule: Serializer.revisionSchedule(schedule),
      created,
    });
  });
}
