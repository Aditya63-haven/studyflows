import { Notification, NotificationType } from '../../domain/entities/Notification';
import { NotificationDocument } from '../schemas/notification.schema';

export class NotificationMapper {
  public static toDomain(document: NotificationDocument): Notification {
    return new Notification({
      id: document._id,
      userId: document.owner,
      type: document.type as NotificationType,
      title: document.title,
      message: document.message,
      read: document.read,
      dedupeKey: document.dedupeKey,
      createdAt: document.createdAt,
    });
  }

  public static toPersistence(notification: Notification): NotificationDocument {
    return {
      _id: notification.getId(),
      owner: notification.getUserId(),
      type: notification.getType(),
      title: notification.getTitle(),
      message: notification.getMessage(),
      read: notification.isRead(),
      dedupeKey: notification.getDedupeKey(),
      createdAt: notification.getCreatedAt(),
      updatedAt: notification.getCreatedAt(),
    };
  }
}
