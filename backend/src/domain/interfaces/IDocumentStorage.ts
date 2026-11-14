import { Readable } from 'stream';
import { DocumentFormat } from '../entities/StudyDocument';

export interface DocumentReadResult {
  stream: Readable;
  size: number;
}

/**
 * OOP: Abstraction - uploaded source files can move from local disk to object
 * storage without changing document use cases.
 */
export interface IDocumentStorage {
  save(buffer: Buffer, format: DocumentFormat): Promise<string>;
  get(key: string): Promise<DocumentReadResult | null>;
  delete(key: string): Promise<void>;
}
