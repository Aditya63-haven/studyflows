import { ExamPlan } from '../domain/entities/ExamPlan';
import { ExamPlanMapper } from '../persistence/mappers/examPlanMapper';
import { ExamPlanDocument, ExamPlanModel } from '../persistence/schemas/examPlan.schema';
import { BaseRepository } from './BaseRepository';

export class ExamPlanRepository extends BaseRepository<ExamPlan, ExamPlanDocument> {
  constructor() {
    super(ExamPlanModel);
  }

  public findByOwner(ownerId: string): Promise<ExamPlan[]> {
    return this.findMany({ owner: ownerId });
  }

  protected override toDomain(document: ExamPlanDocument): ExamPlan {
    return ExamPlanMapper.toDomain(document);
  }

  protected override toPersistence(entity: ExamPlan): ExamPlanDocument {
    return ExamPlanMapper.toPersistence(entity);
  }
}
