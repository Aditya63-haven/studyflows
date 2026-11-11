import { StudySpace } from '../domain/entities/StudySpace';
import { StudySpaceMapper } from '../persistence/mappers/studySpaceMapper';
import {
  StudySpaceDocument,
  StudySpaceModel,
} from '../persistence/schemas/studySpace.schema';
import { BaseRepository } from './BaseRepository';

export class StudySpaceRepository extends BaseRepository<StudySpace, StudySpaceDocument> {
  constructor() {
    super(StudySpaceModel);
  }

  public findByOwner(ownerId: string): Promise<StudySpace[]> {
    return this.findMany({ owner: ownerId });
  }

  protected override toDomain(document: StudySpaceDocument): StudySpace {
    return StudySpaceMapper.toDomain(document);
  }

  protected override toPersistence(entity: StudySpace): StudySpaceDocument {
    return StudySpaceMapper.toPersistence(entity);
  }
}
