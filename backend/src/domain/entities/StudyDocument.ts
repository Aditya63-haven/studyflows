import { ValidationError } from '../../errors';
import {
  requireDate,
  requireNonEmpty,
  requireNumberInRange,
  resolveId,
} from '../base/helpers';

export type DocumentFormat = 'pdf' | 'docx' | 'txt' | 'md';
export type DocumentStatus = 'processing' | 'ready' | 'failed';

export const DOCUMENT_FORMATS: readonly DocumentFormat[] = ['pdf', 'docx', 'txt', 'md'];

export const DOCUMENT_MIME_TYPES: Record<DocumentFormat, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown',
};

export const DOCUMENT_KEY_PATTERN = /^[a-f0-9]{48}\.(pdf|docx|txt|md)$/;

export interface StudyDocumentProps {
  id?: string;
  ownerId: string;
  spaceId: string;
  originalName: string;
  format: DocumentFormat;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  status?: DocumentStatus;
  errorMessage?: string | null;
  pageCount?: number;
  characterCount?: number;
  chunkCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Uploaded academic source file and its extraction state.
 *
 * OOP: Encapsulation - storage details and processing state are private and
 * exposed through validated accessors.
 * OOP: Association - belongs to a User and a StudySpace through ids.
 */
export class StudyDocument {
  private readonly _id: string;
  private readonly _ownerId: string;
  private readonly _spaceId: string;
  private readonly _originalName: string;
  private readonly _format: DocumentFormat;
  private readonly _mimeType: string;
  private readonly _sizeBytes: number;
  private readonly _storageKey: string;
  private _status: DocumentStatus;
  private _errorMessage: string | null;
  private _pageCount: number;
  private _characterCount: number;
  private _chunkCount: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: StudyDocumentProps) {
    this._id = resolveId(props.id);
    this._ownerId = requireNonEmpty(props.ownerId, 'ownerId');
    this._spaceId = requireNonEmpty(props.spaceId, 'spaceId');
    this._originalName = requireNonEmpty(props.originalName, 'originalName');
    if (!DOCUMENT_FORMATS.includes(props.format)) {
      throw new ValidationError('Unsupported document format');
    }
    this._format = props.format;
    this._mimeType = requireNonEmpty(props.mimeType, 'mimeType');
    this._sizeBytes = StudyDocument.nonNegativeInteger(props.sizeBytes, 'sizeBytes');
    this._storageKey = requireNonEmpty(props.storageKey, 'storageKey');
    this._status = StudyDocument.parseStatus(props.status);
    this._errorMessage = props.errorMessage?.trim() || null;
    this._pageCount = StudyDocument.nonNegativeInteger(props.pageCount ?? 0, 'pageCount');
    this._characterCount = StudyDocument.nonNegativeInteger(
      props.characterCount ?? 0,
      'characterCount',
    );
    this._chunkCount = StudyDocument.nonNegativeInteger(props.chunkCount ?? 0, 'chunkCount');
    this._createdAt = props.createdAt ? requireDate(props.createdAt, 'createdAt') : new Date();
    this._updatedAt = props.updatedAt
      ? requireDate(props.updatedAt, 'updatedAt')
      : new Date(this._createdAt);
  }

  public getId(): string {
    return this._id;
  }

  public getOwnerId(): string {
    return this._ownerId;
  }

  public getSpaceId(): string {
    return this._spaceId;
  }

  public getOriginalName(): string {
    return this._originalName;
  }

  public getFormat(): DocumentFormat {
    return this._format;
  }

  public getMimeType(): string {
    return this._mimeType;
  }

  public getSizeBytes(): number {
    return this._sizeBytes;
  }

  public getStorageKey(): string {
    return this._storageKey;
  }

  public getStatus(): DocumentStatus {
    return this._status;
  }

  public getErrorMessage(): string | null {
    return this._errorMessage;
  }

  public getPageCount(): number {
    return this._pageCount;
  }

  public getCharacterCount(): number {
    return this._characterCount;
  }

  public getChunkCount(): number {
    return this._chunkCount;
  }

  public getCreatedAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  public getUpdatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  public markReady(pageCount: number, characterCount: number, chunkCount: number): void {
    this._pageCount = StudyDocument.nonNegativeInteger(pageCount, 'pageCount');
    this._characterCount = StudyDocument.nonNegativeInteger(
      characterCount,
      'characterCount',
    );
    this._chunkCount = StudyDocument.nonNegativeInteger(chunkCount, 'chunkCount');
    this._status = 'ready';
    this._errorMessage = null;
    this.touch();
  }

  public markFailed(message: string): void {
    this._status = 'failed';
    this._errorMessage = requireNonEmpty(message, 'errorMessage');
    this.touch();
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  private static parseStatus(value: DocumentStatus | undefined): DocumentStatus {
    if (value === undefined) {
      return 'processing';
    }
    if (value === 'processing' || value === 'ready' || value === 'failed') {
      return value;
    }
    throw new ValidationError('Invalid document status');
  }

  private static nonNegativeInteger(value: number, field: string): number {
    if (!Number.isInteger(value) || value < 0) {
      throw new ValidationError(`${field} must be a non-negative integer`);
    }
    return requireNumberInRange(value, field, 0, Number.MAX_SAFE_INTEGER);
  }
}
