import { Request, Response } from 'express';
import { ReviewRating } from '../domain/interfaces/IRevisionStrategy';
import { asyncHandler } from '../middleware/asyncHandler';
import { RevisionService } from '../services/RevisionService';
import { authContext } from '../utils/authContext';
import { Serializer } from '../utils/serializers';

interface ReviewScheduleBody {
  rating: ReviewRating;
}

/**
 * HTTP adapter for spaced-repetition use cases.
 */
export class RevisionController {
  constructor(private readonly revisionService: RevisionService) {}

  public list = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const schedules = await this.revisionService.list(userId);
    res.status(200).json({
      schedules: schedules.map((schedule) => Serializer.revisionSchedule(schedule)),
    });
  });

  public dashboard = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const dashboard = await this.revisionService.dashboard(userId);
    res.status(200).json({
      counts: dashboard.counts,
      dueToday: dashboard.dueToday.map((schedule) =>
        Serializer.revisionSchedule(schedule),
      ),
      needsRevision: dashboard.needsRevision.map((schedule) =>
        Serializer.revisionSchedule(schedule),
      ),
      mastered: dashboard.mastered.map((schedule) =>
        Serializer.revisionSchedule(schedule),
      ),
      scheduled: dashboard.scheduled.map((schedule) =>
        Serializer.revisionSchedule(schedule),
      ),
    });
  });

  public review = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const { rating } = req.body as ReviewScheduleBody;
    const schedule = await this.revisionService.review(userId, req.params.id, rating);
    res.status(200).json({ schedule: Serializer.revisionSchedule(schedule) });
  });
}
