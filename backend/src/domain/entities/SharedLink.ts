import { ValidationError } from '../../errors';
import { requireDate, requireNonEmpty, resolveId } from '../base/helpers';

export type ShareableItemType = 'note' | 'quiz';

export interface SharedLinkProps {
  id?: string;
  token: string;
  itemId: string;
  itemType: ShareableItemType;
  ownerId: string;
  createdAt?: Date;
  expiresAt?: Date | null;
  revoked?: boolean;
}

/**
 * Public, read-only share link for a note or quiz.
 *
 * OOP: Association - references one StudyItem through `itemId` and `itemType`.
 * OOP: Encapsulation - active state is computed from validated fields.
 */
export class SharedLink {
  private readonly _id: string;
  private readonly _token: string;
  private readonly _itemId: string;
  private readonly _itemType: ShareableItemType;
  private readonly _ownerId: string;
  private readonly _createdAt: Date;
  private readonly _expiresAt: Date | null;
  private _revoked: boolean;

  constructor(props: SharedLinkProps) {
    this._id = resolveId(props.id);
    this._token = requireNonEmpty(props.token, 'token');
    this._itemId = requireNonEmpty(props.itemId, 'itemId');
    this._itemType = SharedLink.validateItemType(props.itemType);
    this._ownerId = requireNonEmpty(props.ownerId, 'ownerId');
    this._createdAt = props.createdAt ? requireDate(props.createdAt, 'createdAt') : new Date();
    this._expiresAt = props.expiresAt ? requireDate(props.expiresAt, 'expiresAt') : null;
    this._revoked = props.revoked ?? false;
  }

  public getId(): string {
    return this._id;
  }

  public getToken(): string {
    return this._token;
  }

  public getItemId(): string {
    return this._itemId;
  }

  public getItemType(): ShareableItemType {
    return this._itemType;
  }

  public getOwnerId(): string {
    return this._ownerId;
  }

  public getCreatedAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  public getExpiresAt(): Date | null {
    return this._expiresAt ? new Date(this._expiresAt.getTime()) : null;
  }

  public isRevoked(): boolean {
    return this._revoked;
  }

  public revoke(): void {
    this._revoked = true;
  }

  public isActive(now: Date = new Date()): boolean {
    if (this._revoked) {
      return false;
    }
    return !this._expiresAt || this._expiresAt.getTime() > now.getTime();
  }

  private static validateItemType(itemType: ShareableItemType): ShareableItemType {
    if (itemType === 'note' || itemType === 'quiz') {
      return itemType;
    }
    throw new ValidationError('itemType must be "note" or "quiz"');
  }
}
