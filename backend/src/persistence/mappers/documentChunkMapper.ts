import { DocumentChunk } from '../../domain/entities/DocumentChunk';
import { DocumentChunkRecord } from '../schemas/documentChunk.schema';

export class DocumentChunkMapper {
  public static toDomain(record: DocumentChunkRecord): DocumentChunk {
    return new DocumentChunk({
      id: record._id,
      documentId: record.document,
      ownerId: record.owner,
      spaceId: record.space,
      chunkIndex: record.chunkIndex,
      text: record.text,
      pageNumber: record.pageNumber,
      section: record.section,
      createdAt: record.createdAt,
    });
  }

  public static toPersistence(chunk: DocumentChunk): DocumentChunkRecord {
    return {
      _id: chunk.getId(),
      document: chunk.getDocumentId(),
      owner: chunk.getOwnerId(),
      space: chunk.getSpaceId(),
      chunkIndex: chunk.getChunkIndex(),
      text: chunk.getText(),
      pageNumber: chunk.getPageNumber(),
      section: chunk.getSection(),
      createdAt: chunk.getCreatedAt(),
    };
  }
}
