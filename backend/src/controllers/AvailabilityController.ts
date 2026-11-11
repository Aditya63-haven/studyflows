import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  AvailabilityService,
  DayAvailabilityInput,
} from '../services/AvailabilityService';
import { authContext } from '../utils/authContext';
import { Serializer } from '../utils/serializers';

/**
 * HTTP adapter for study availability use cases.
 */
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  public get = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const availability = await this.availabilityService.getByUser(userId);
    res.status(200).json({ availability: Serializer.availability(availability) });
  });

  public saveWeek = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const availability = await this.availabilityService.saveWeek(
      userId,
      req.body.days as DayAvailabilityInput[],
    );
    res.status(200).json({ availability: Serializer.availability(availability) });
  });

  public saveDay = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const availability = await this.availabilityService.saveDay(
      userId,
      req.params.weekday as unknown as number,
      req.body as DayAvailabilityInput,
    );
    res.status(200).json({ availability: Serializer.availability(availability) });
  });
}
