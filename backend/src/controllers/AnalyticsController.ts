import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { AnalyticsService } from '../services/AnalyticsService';
import { authContext } from '../utils/authContext';

/**
 * HTTP adapter for analytics use cases.
 */
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  public overview = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const overview = await this.analyticsService.getOverview(userId);
    res.status(200).json({ analytics: overview });
  });
}
