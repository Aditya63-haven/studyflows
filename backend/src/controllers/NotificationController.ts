import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { AttentionService } from '../services/AttentionService';
import { NotificationService } from '../services/NotificationService';
import { authContext } from '../utils/authContext';
import { Serializer } from '../utils/serializers';

/**
 * HTTP adapter for notification use cases.
 */
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly attentionService: AttentionService,
  ) {}

  public list = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    await this.attentionService.publishDetectedEvents(userId);
    const notifications = await this.notificationService.list(userId);
    res.status(200).json({
      notifications: notifications.map((notification) =>
        Serializer.notification(notification),
      ),
      unreadCount: notifications.filter((notification) => !notification.isRead()).length,
    });
  });

  public markRead = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const notification = await this.notificationService.markRead(userId, req.params.id);
    res.status(200).json({ notification: Serializer.notification(notification) });
  });
}
