import { Bookmark } from '../../domain/entities/Bookmark';
import { BookmarkDocument } from '../schemas/bookmark.schema';

export class BookmarkMapper {
  public static toDomain(document: BookmarkDocument): Bookmark {
    return new Bookmark({
      id: document._id,
      userId: document.owner,
      itemId: document.itemId,
      itemType: document.itemType,
      createdAt: document.createdAt,
    });
  }

  public static toPersistence(bookmark: Bookmark): BookmarkDocument {
    return {
      _id: bookmark.getId(),
      owner: bookmark.getUserId(),
      itemId: bookmark.getItemId(),
      itemType: bookmark.getItemType(),
      createdAt: bookmark.getCreatedAt(),
      updatedAt: bookmark.getCreatedAt(),
    };
  }
}
