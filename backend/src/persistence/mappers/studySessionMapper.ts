import { StudySession } from '../../domain/entities/StudySession';
import { StudySessionDocument } from '../schemas/studySession.schema';

export class StudySessionMapper {
  public static toDomain(document: StudySessionDocument): StudySession {
    return new StudySession({
      id: document._id,
      userId: document.owner,
      spaceId: document.spaceId,
      subject: document.subject,
      durationMinutes: document.durationMinutes,
      startedAt: document.startedAt,
      endedAt: document.endedAt,
      createdAt: document.createdAt,
    });
  }

  public static toPersistence(session: StudySession): StudySessionDocument {
    return {
      _id: session.getId(),
      owner: session.getUserId(),
      spaceId: session.getSpaceId(),
      subject: session.getSubject(),
      durationMinutes: session.getDurationMinutes(),
      startedAt: session.getStartedAt(),
      endedAt: session.getEndedAt(),
      createdAt: session.getCreatedAt(),
      updatedAt: session.getCreatedAt(),
    };
  }
}
