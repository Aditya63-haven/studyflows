import { FilterQuery } from 'mongoose';
import { DocumentChunk } from '../domain/entities/DocumentChunk';
import { DocumentChunkMapper } from '../persistence/mappers/documentChunkMapper';
import {
  DocumentChunkModel,
  DocumentChunkRecord,
} from '../persistence/schemas/documentChunk.schema';
import { BaseRepository } from './BaseRepository';

export class DocumentChunkRepository extends BaseRepository<
  DocumentChunk,
  DocumentChunkRecord
> {
  constructor() {
    super(DocumentChunkModel);
  }

  public async findByDocument(documentId: string): Promise<DocumentChunk[]> {
    const records = await this.model
      .find({ document: documentId } as FilterQuery<DocumentChunkRecord>)
      .sort({ chunkIndex: 1 })
      .exec();
    return records.map((record) =>
      DocumentChunkMapper.toDomain(record.toObject() as DocumentChunkRecord),
    );
  }

  public async findByDocuments(
    documentIds: string[],
    ownerId: string,
    spaceId: string,
  ): Promise<DocumentChunk[]> {
    if (documentIds.length === 0) {
      return [];
    }
    const records = await this.model
      .find({
        document: { $in: documentIds },
        owner: ownerId,
        space: spaceId,
      } as FilterQuery<DocumentChunkRecord>)
      .sort({ document: 1, chunkIndex: 1 })
      .exec();
    return records.map((record) =>
      DocumentChunkMapper.toDomain(record.toObject() as DocumentChunkRecord),
    );
  }

  public async createMany(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    if (chunks.length === 0) {
      return [];
    }
    const records = await this.model.insertMany(
      chunks.map((chunk) => this.toPersistence(chunk)),
    );
    return records.map((record) =>
      DocumentChunkMapper.toDomain(record.toObject() as DocumentChunkRecord),
    );
  }

  public async deleteByDocument(documentId: string): Promise<number> {
    const result = await this.model.deleteMany({ document: documentId }).exec();
    return result.deletedCount ?? 0;
  }

  public async deleteBySpace(spaceId: string): Promise<number> {
    const result = await this.model.deleteMany({ space: spaceId }).exec();
    return result.deletedCount ?? 0;
  }

  protected override toDomain(record: DocumentChunkRecord): DocumentChunk {
    return DocumentChunkMapper.toDomain(record);
  }

  protected override toPersistence(chunk: DocumentChunk): DocumentChunkRecord {
    return DocumentChunkMapper.toPersistence(chunk);
  }
}
