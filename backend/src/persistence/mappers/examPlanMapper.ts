import { ExamPlan } from '../../domain/entities/ExamPlan';
import { StudyDay } from '../../domain/entities/StudyDay';
import { Topic } from '../../domain/entities/Topic';
import { ExamPlanDocument } from '../schemas/examPlan.schema';

export class ExamPlanMapper {
  public static toDomain(document: ExamPlanDocument): ExamPlan {
    return new ExamPlan({
      id: document._id,
      ownerId: document.owner,
      name: document.name,
      examDate: document.examDate,
      dailyStudyHours: document.dailyStudyHours,
      topics: document.topics.map(
        (topic) =>
          new Topic({
            id: topic._id,
            name: topic.name,
            description: topic.description,
            estimatedMinutes: topic.estimatedMinutes,
          }),
      ),
      studyDays: document.studyDays.map(
        (day) =>
          new StudyDay({
            id: day._id,
            date: day.date,
            topicIds: day.topicIds,
            completedTopicIds: day.completedTopicIds,
            plannedMinutes: day.plannedMinutes,
          }),
      ),
      spaceId: document.spaceId ?? null,
      documentIds: document.documentIds ?? [],
      preparation: document.preparation
        ? {
            provider: document.preparation.provider,
            strategySummary: document.preparation.strategySummary,
            approvedAt: document.preparation.approvedAt,
            approvalFingerprint: document.preparation.approvalFingerprint,
            requiredMinutes: document.preparation.requiredMinutes,
            scheduledMinutes: document.preparation.scheduledMinutes,
            shortfallMinutes: document.preparation.shortfallMinutes,
          }
        : null,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }

  public static toPersistence(plan: ExamPlan): ExamPlanDocument {
    return {
      _id: plan.getId(),
      owner: plan.getOwnerId(),
      name: plan.getName(),
      examDate: plan.getExamDate(),
      dailyStudyHours: plan.getDailyStudyHours(),
      topics: plan.getTopics().map((topic) => ({
        _id: topic.getId(),
        name: topic.getName(),
        description: topic.getDescription(),
        estimatedMinutes: topic.getEstimatedMinutes(),
      })),
      studyDays: plan.getStudyDays().map((day) => ({
        _id: day.getId(),
        date: day.getDate(),
        topicIds: day.getTopicIds(),
        completedTopicIds: day.getCompletedTopicIds(),
        plannedMinutes: day.getPlannedMinutes(),
      })),
      spaceId: plan.getSpaceId(),
      documentIds: plan.getDocumentIds(),
      preparation: plan.getPreparation()
        ? {
            provider: plan.getPreparation()!.provider,
            strategySummary: plan.getPreparation()!.strategySummary,
            approvedAt: plan.getPreparation()!.approvedAt,
            approvalFingerprint: plan.getPreparation()!.approvalFingerprint,
            requiredMinutes: plan.getPreparation()!.requiredMinutes,
            scheduledMinutes: plan.getPreparation()!.scheduledMinutes,
            shortfallMinutes: plan.getPreparation()!.shortfallMinutes,
          }
        : null,
      createdAt: plan.getCreatedAt(),
      updatedAt: plan.getUpdatedAt(),
    };
  }
}
