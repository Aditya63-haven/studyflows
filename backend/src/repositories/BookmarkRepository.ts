import { Bookmark } from '../domain/entities/Bookmark';
import { BookmarkMapper } from '../persistence/mappers/bookmarkMapper';
import { BookmarkDocument, BookmarkModel } from '../persistence/schemas/bookmark.schema';
import { BaseRepository } from './BaseRepository';

export class BookmarkRepository extends BaseRepository<Bookmark, BookmarkDocument> {
  constructor() {
    super(BookmarkModel);
  }

  public findByUser(userId: string): Promise<Bookmark[]> {
    return this.findMany({ owner: userId });
  }

  public async findByUserAndItem(
    userId: string,
    itemId: string,
    itemType: 'note' | 'quiz' | 'flashcarddeck',
  ): Promise<Bookmark | null> {
    const document = await this.model.findOne({ owner: userId, itemId, itemType }).exec();
    return document
      ? BookmarkMapper.toDomain(document.toObject() as unknown as BookmarkDocument)
      : null;
  }

  public async deleteByItem(
    itemId: string,
    itemType: 'note' | 'quiz' | 'flashcarddeck',
  ): Promise<number> {
    const result = await this.model.deleteMany({ itemId, itemType }).exec();
    return result.deletedCount ?? 0;
  }

  protected override toDomain(document: BookmarkDocument): Bookmark {
    return BookmarkMapper.toDomain(document);
  }

  protected override toPersistence(entity: Bookmark): BookmarkDocument {
    return BookmarkMapper.toPersistence(entity);
  }
}
