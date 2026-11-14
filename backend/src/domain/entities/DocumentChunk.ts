import { ValidationError } from '../../errors';
import { requireDate, requireNonEmpty, resolveId } from '../base/helpers';

export interface DocumentChunkProps {
  id?: string;
  documentId: string;
  ownerId: string;
  spaceId: string;
  chunkIndex: number;
  text: string;
  pageNumber?: number | null;
  section?: string | null;
  createdAt?: Date;
}

/**
 * A retrieval-sized excerpt extracted from a StudyDocument.
 *
 * OOP: Composition - chunks are owned by their document and are removed with it.
 * OOP: Association - carries the owner and space ids for authorization filters.
 */
export class DocumentChunk {
  private readonly _id: string;
  private readonly _documentId: string;
  private readonly _ownerId: string;
  private readonly _spaceId: string;
  private readonly _chunkIndex: number;
  private readonly _text: string;
  private readonly _pageNumber: number | null;
  private readonly _section: string | null;
  private readonly _createdAt: Date;

  constructor(props: DocumentChunkProps) {
    this._id = resolveId(props.id);
    this._documentId = requireNonEmpty(props.documentId, 'documentId');
    this._ownerId = requireNonEmpty(props.ownerId, 'ownerId');
    this._spaceId = requireNonEmpty(props.spaceId, 'spaceId');
    if (!Number.isInteger(props.chunkIndex) || props.chunkIndex < 0) {
      throw new ValidationError('chunkIndex must be a non-negative integer');
    }
    this._chunkIndex = props.chunkIndex;
    this._text = requireNonEmpty(props.text, 'text');
    if (
      props.pageNumber !== undefined &&
      props.pageNumber !== null &&
      (!Number.isInteger(props.pageNumber) || props.pageNumber < 1)
    ) {
      throw new ValidationError('pageNumber must be a positive integer or null');
    }
    this._pageNumber = props.pageNumber ?? null;
    this._section = props.section?.trim() || null;
    this._createdAt = props.createdAt ? requireDate(props.createdAt, 'createdAt') : new Date();
  }

  public getId(): string {
    return this._id;
  }

  public getDocumentId(): string {
    return this._documentId;
  }

  public getOwnerId(): string {
    return this._ownerId;
  }

  public getSpaceId(): string {
    return this._spaceId;
  }

  public getChunkIndex(): number {
    return this._chunkIndex;
  }

  public getText(): string {
    return this._text;
  }

  public getPageNumber(): number | null {
    return this._pageNumber;
  }

  public getSection(): string | null {
    return this._section;
  }

  public getCreatedAt(): Date {
    return new Date(this._createdAt.getTime());
  }
}
