import { QuizAttempt } from '../domain/entities/QuizAttempt';
import { QuizAttemptMapper } from '../persistence/mappers/quizAttemptMapper';
import {
  QuizAttemptDocument,
  QuizAttemptModel,
} from '../persistence/schemas/quizAttempt.schema';
import { BaseRepository } from './BaseRepository';

export class QuizAttemptRepository extends BaseRepository<QuizAttempt, QuizAttemptDocument> {
  constructor() {
    super(QuizAttemptModel);
  }

  public findByUser(userId: string): Promise<QuizAttempt[]> {
    return this.findMany({ owner: userId });
  }

  public findByQuiz(quizId: string): Promise<QuizAttempt[]> {
    return this.findMany({ quizId });
  }

  public findByUserAndQuiz(userId: string, quizId: string): Promise<QuizAttempt[]> {
    return this.findMany({ owner: userId, quizId });
  }

  protected override toDomain(document: QuizAttemptDocument): QuizAttempt {
    return QuizAttemptMapper.toDomain(document);
  }

  protected override toPersistence(entity: QuizAttempt): QuizAttemptDocument {
    return QuizAttemptMapper.toPersistence(entity);
  }
}
