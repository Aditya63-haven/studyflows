import { RevisionSchedule } from '../../domain/entities/RevisionSchedule';
import { RevisionScheduleDocument } from '../schemas/revisionSchedule.schema';

export class RevisionScheduleMapper {
  public static toDomain(document: RevisionScheduleDocument): RevisionSchedule {
    return new RevisionSchedule({
      id: document._id,
      userId: document.owner,
      topicId: document.topicId,
      topicName: document.topicName,
      memoryStrength: document.memoryStrength,
      easeFactor: document.easeFactor,
      intervalDays: document.intervalDays,
      reviewCount: document.reviewCount,
      lastReviewedAt: document.lastReviewedAt,
      nextReviewAt: document.nextReviewAt,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }

  public static toPersistence(schedule: RevisionSchedule): RevisionScheduleDocument {
    return {
      _id: schedule.getId(),
      owner: schedule.getUserId(),
      topicId: schedule.getTopicId(),
      topicName: schedule.getTopicName(),
      memoryStrength: schedule.getMemoryStrength(),
      easeFactor: schedule.getEaseFactor(),
      intervalDays: schedule.getIntervalDays(),
      reviewCount: schedule.toReviewState().reviewCount,
      lastReviewedAt: schedule.getLastReviewedAt(),
      nextReviewAt: schedule.getNextReviewAt(),
      createdAt: schedule.getCreatedAt(),
      updatedAt: schedule.getUpdatedAt(),
    };
  }
}
