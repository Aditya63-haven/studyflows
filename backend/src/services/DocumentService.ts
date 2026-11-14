import { DocumentChunk } from '../domain/entities/DocumentChunk';
import { StudyDocument } from '../domain/entities/StudyDocument';
import { IDocumentStorage } from '../domain/interfaces/IDocumentStorage';
import { AppError, ForbiddenError, NotFoundError } from '../errors';
import { DocumentChunkRepository } from '../repositories/DocumentChunkRepository';
import { StudyDocumentRepository } from '../repositories/StudyDocumentRepository';
import {
  DocumentProcessingService,
  UploadedDocumentFile,
} from './DocumentProcessingService';
import { StudySpaceService } from './StudySpaceService';

export interface DocumentDownload {
  document: StudyDocument;
  stream: NodeJS.ReadableStream;
  size: number;
}

/**
 * Document upload, listing, download and deletion use cases.
 *
 * OOP: SRP - coordinates ownership, storage and processing without parsing
 * formats itself.
 * OOP: DIP - depends on the storage abstraction and repositories.
 */
export class DocumentService {
  constructor(
    private readonly spaceService: StudySpaceService,
    private readonly documentRepository: StudyDocumentRepository,
    private readonly chunkRepository: DocumentChunkRepository,
    private readonly storage: IDocumentStorage,
    private readonly processor: DocumentProcessingService,
  ) {}

  public async listBySpace(userId: string, spaceId: string): Promise<StudyDocument[]> {
    const space = await this.spaceService.getOwned(userId, spaceId);
    const documents = await this.documentRepository.findBySpace(space.getId());
    return documents.filter((document) => document.getOwnerId() === userId);
  }

  public async upload(
    userId: string,
    spaceId: string,
    file: UploadedDocumentFile,
  ): Promise<StudyDocument> {
    const space = await this.spaceService.getOwned(userId, spaceId);
    const validated = this.processor.validate(file);
    const storageKey = await this.storage.save(file.buffer, validated.format);

    let document = new StudyDocument({
      ownerId: userId,
      spaceId: space.getId(),
      originalName: validated.originalName,
      format: validated.format,
      mimeType: validated.mimeType,
      sizeBytes: validated.sizeBytes,
      storageKey,
      status: 'processing',
    });

    try {
      document = await this.documentRepository.create(document);
    } catch (error) {
      await this.safeDelete(storageKey);
      throw error;
    }

    try {
      const processed = await this.processor.process(file.buffer, validated.format);
      const chunks = processed.chunks.map(
        (chunk, index) =>
          new DocumentChunk({
            documentId: document.getId(),
            ownerId: userId,
            spaceId: space.getId(),
            chunkIndex: index,
            text: chunk.text,
            pageNumber: chunk.pageNumber,
            section: chunk.section,
          }),
      );

      await this.chunkRepository.createMany(chunks);
      document.markReady(
        processed.pageCount,
        processed.characterCount,
        chunks.length,
      );

      const updated = await this.documentRepository.update(document.getId(), document);
      if (!updated) {
        throw new NotFoundError('Document not found');
      }
      return updated;
    } catch (error) {
      await this.chunkRepository.deleteByDocument(document.getId()).catch(() => undefined);
      const message =
        error instanceof AppError
          ? error.message
          : 'Document processing failed. Try another file.';
      document.markFailed(message);

      const failed = await this.documentRepository.update(document.getId(), document);
      if (!failed) {
        await this.safeDelete(storageKey);
        throw error;
      }
      return failed;
    }
  }

  public async getOwned(userId: string, documentId: string): Promise<StudyDocument> {
    const document = await this.documentRepository.findById(documentId);
    if (!document) {
      throw new NotFoundError('Document not found');
    }
    if (document.getOwnerId() !== userId) {
      throw new ForbiddenError('You do not own this document');
    }
    return document;
  }

  public async read(userId: string, documentId: string): Promise<DocumentDownload> {
    const document = await this.getOwned(userId, documentId);
    const stored = await this.storage.get(document.getStorageKey());
    if (!stored) {
      throw new NotFoundError('Document file not found');
    }
    return {
      document,
      stream: stored.stream,
      size: stored.size,
    };
  }

  public async delete(userId: string, documentId: string): Promise<void> {
    const document = await this.getOwned(userId, documentId);
    await this.storage.delete(document.getStorageKey());
    await this.chunkRepository.deleteByDocument(document.getId());
    const deleted = await this.documentRepository.delete(document.getId());
    if (!deleted) {
      throw new NotFoundError('Document not found');
    }
  }

  private async safeDelete(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch (error) {
      console.warn(`[documents] Failed to delete stored file ${key}`, error);
    }
  }
}
