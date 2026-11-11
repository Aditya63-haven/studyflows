import { endOfDay } from '../domain/base/helpers';
import { RevisionSchedule } from '../domain/entities/RevisionSchedule';
import { RevisionScheduleMapper } from '../persistence/mappers/revisionScheduleMapper';
import {
  RevisionScheduleDocument,
  RevisionScheduleModel,
} from '../persistence/schemas/revisionSchedule.schema';
import { BaseRepository } from './BaseRepository';

export class RevisionScheduleRepository extends BaseRepository<
  RevisionSchedule,
  RevisionScheduleDocument
> {
  constructor() {
    super(RevisionScheduleModel);
  }

  public findByUser(userId: string): Promise<RevisionSchedule[]> {
    return this.findMany({ owner: userId });
  }

  public async findByUserAndTopic(
    userId: string,
    topicId: string,
  ): Promise<RevisionSchedule | null> {
    const document = await this.model.findOne({ owner: userId, topicId }).exec();
    return document
      ? RevisionScheduleMapper.toDomain(
          document.toObject() as unknown as RevisionScheduleDocument,
        )
      : null;
  }

  public findDue(userId: string, now: Date = new Date()): Promise<RevisionSchedule[]> {
    return this.findMany({
      owner: userId,
      nextReviewAt: { $lte: endOfDay(now) },
    });
  }

  protected override toDomain(document: RevisionScheduleDocument): RevisionSchedule {
    return RevisionScheduleMapper.toDomain(document);
  }

  protected override toPersistence(entity: RevisionSchedule): RevisionScheduleDocument {
    return RevisionScheduleMapper.toPersistence(entity);
  }
}
