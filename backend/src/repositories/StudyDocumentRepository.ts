import { FilterQuery } from 'mongoose';
import { StudyDocument } from '../domain/entities/StudyDocument';
import { StudyDocumentMapper } from '../persistence/mappers/studyDocumentMapper';
import {
  StudyDocumentModel,
  StudyDocumentRecord,
} from '../persistence/schemas/studyDocument.schema';
import { BaseRepository } from './BaseRepository';

export class StudyDocumentRepository extends BaseRepository<
  StudyDocument,
  StudyDocumentRecord
> {
  constructor() {
    super(StudyDocumentModel);
  }

  public async findBySpace(spaceId: string): Promise<StudyDocument[]> {
    const records = await this.model
      .find({ space: spaceId } as FilterQuery<StudyDocumentRecord>)
      .sort({ createdAt: -1 })
      .exec();
    return records.map((record) =>
      StudyDocumentMapper.toDomain(record.toObject() as StudyDocumentRecord),
    );
  }

  public async deleteBySpace(spaceId: string): Promise<number> {
    const result = await this.model.deleteMany({ space: spaceId }).exec();
    return result.deletedCount ?? 0;
  }

  protected override toDomain(record: StudyDocumentRecord): StudyDocument {
    return StudyDocumentMapper.toDomain(record);
  }

  protected override toPersistence(document: StudyDocument): StudyDocumentRecord {
    return StudyDocumentMapper.toPersistence(document);
  }
}
