import { Quiz } from '../domain/entities/Quiz';
import { QuizMapper } from '../persistence/mappers/quizMapper';
import { QuizDocument, QuizModel } from '../persistence/schemas/quiz.schema';
import { BaseRepository } from './BaseRepository';

export class QuizRepository extends BaseRepository<Quiz, QuizDocument> {
  constructor() {
    super(QuizModel);
  }

  public findByOwner(ownerId: string): Promise<Quiz[]> {
    return this.findMany({ owner: ownerId });
  }

  public findBySpace(spaceId: string): Promise<Quiz[]> {
    return this.findMany({ space: spaceId });
  }

  public async deleteBySpace(spaceId: string): Promise<number> {
    const result = await this.model.deleteMany({ space: spaceId }).exec();
    return result.deletedCount ?? 0;
  }

  protected override toDomain(document: QuizDocument): Quiz {
    return QuizMapper.toDomain(document);
  }

  protected override toPersistence(entity: Quiz): QuizDocument {
    return QuizMapper.toPersistence(entity);
  }
}
