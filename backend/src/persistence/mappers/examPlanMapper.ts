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
      createdAt: plan.getCreatedAt(),
      updatedAt: plan.getUpdatedAt(),
    };
  }
}
