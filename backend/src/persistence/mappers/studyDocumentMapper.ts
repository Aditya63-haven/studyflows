import { StudyDocument } from '../../domain/entities/StudyDocument';
import { StudyDocumentRecord } from '../schemas/studyDocument.schema';

export class StudyDocumentMapper {
  public static toDomain(record: StudyDocumentRecord): StudyDocument {
    return new StudyDocument({
      id: record._id,
      ownerId: record.owner,
      spaceId: record.space,
      originalName: record.originalName,
      format: record.format,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      storageKey: record.storageKey,
      status: record.status,
      errorMessage: record.errorMessage,
      pageCount: record.pageCount,
      characterCount: record.characterCount,
      chunkCount: record.chunkCount,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  public static toPersistence(document: StudyDocument): StudyDocumentRecord {
    return {
      _id: document.getId(),
      owner: document.getOwnerId(),
      space: document.getSpaceId(),
      originalName: document.getOriginalName(),
      format: document.getFormat(),
      mimeType: document.getMimeType(),
      sizeBytes: document.getSizeBytes(),
      storageKey: document.getStorageKey(),
      status: document.getStatus(),
      errorMessage: document.getErrorMessage(),
      pageCount: document.getPageCount(),
      characterCount: document.getCharacterCount(),
      chunkCount: document.getChunkCount(),
      createdAt: document.getCreatedAt(),
      updatedAt: document.getUpdatedAt(),
    };
  }
}
