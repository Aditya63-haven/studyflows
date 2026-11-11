import { StudySession } from '../domain/entities/StudySession';
import { StudySessionMapper } from '../persistence/mappers/studySessionMapper';
import {
  StudySessionDocument,
  StudySessionModel,
} from '../persistence/schemas/studySession.schema';
import { BaseRepository } from './BaseRepository';

export class StudySessionRepository extends BaseRepository<
  StudySession,
  StudySessionDocument
> {
  constructor() {
    super(StudySessionModel);
  }

  public findByUser(userId: string): Promise<StudySession[]> {
    return this.findMany({ owner: userId });
  }

  public findByUserSince(userId: string, since: Date): Promise<StudySession[]> {
    return this.findMany({
      owner: userId,
      startedAt: { $gte: since },
    });
  }

  protected override toDomain(document: StudySessionDocument): StudySession {
    return StudySessionMapper.toDomain(document);
  }

  protected override toPersistence(entity: StudySession): StudySessionDocument {
    return StudySessionMapper.toPersistence(entity);
  }
}
