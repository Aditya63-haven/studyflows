import { ValidationError } from '../../errors';
import { StudyItemType } from '../base/StudyItem';
import { requireDate, requireNonEmpty, resolveId } from '../base/helpers';

export interface BookmarkProps {
  id?: string;
  userId: string;
  itemId: string;
  itemType: StudyItemType;
  createdAt?: Date;
}

/**
 * Saved reference from a user to a study item.
 *
 * OOP: Association - Bookmark refers to a StudyItem without owning it.
 */
export class Bookmark {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _itemId: string;
  private readonly _itemType: StudyItemType;
  private readonly _createdAt: Date;

  constructor(props: BookmarkProps) {
    this._id = resolveId(props.id);
    this._userId = requireNonEmpty(props.userId, 'userId');
    this._itemId = requireNonEmpty(props.itemId, 'itemId');
    this._itemType = Bookmark.validateItemType(props.itemType);
    this._createdAt = props.createdAt ? requireDate(props.createdAt, 'createdAt') : new Date();
  }

  public getId(): string {
    return this._id;
  }

  public getUserId(): string {
    return this._userId;
  }

  public getItemId(): string {
    return this._itemId;
  }

  public getItemType(): StudyItemType {
    return this._itemType;
  }

  public getCreatedAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  private static validateItemType(itemType: StudyItemType): StudyItemType {
    if (itemType === 'note' || itemType === 'quiz' || itemType === 'flashcarddeck') {
      return itemType;
    }
    throw new ValidationError('itemType must be "note", "quiz" or "flashcarddeck"');
  }
}
