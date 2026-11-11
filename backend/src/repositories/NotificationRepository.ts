import { Notification } from '../domain/entities/Notification';
import { NotificationMapper } from '../persistence/mappers/notificationMapper';
import {
  NotificationDocument,
  NotificationModel,
} from '../persistence/schemas/notification.schema';
import { BaseRepository } from './BaseRepository';

export class NotificationRepository extends BaseRepository<
  Notification,
  NotificationDocument
> {
  constructor() {
    super(NotificationModel);
  }

  public findByOwner(ownerId: string): Promise<Notification[]> {
    return this.findMany({ owner: ownerId });
  }

  public findByOwnerAndDedupeKey(
    ownerId: string,
    dedupeKey: string,
  ): Promise<Notification[]> {
    return this.findMany({ owner: ownerId, dedupeKey });
  }

  protected override toDomain(document: NotificationDocument): Notification {
    return NotificationMapper.toDomain(document);
  }

  protected override toPersistence(entity: Notification): NotificationDocument {
    return NotificationMapper.toPersistence(entity);
  }
}
