import { ConflictError, ForbiddenError, NotFoundError } from '../errors';
import { Bookmark } from '../domain/entities/Bookmark';
import { StudyItemType } from '../domain/base/StudyItem';
import { FlashcardDeckRepository } from '../repositories/FlashcardDeckRepository';
import { NoteRepository } from '../repositories/NoteRepository';
import { QuizRepository } from '../repositories/QuizRepository';
import { BookmarkRepository } from '../repositories/BookmarkRepository';

export interface CreateBookmarkInput {
  itemId: string;
  itemType: StudyItemType;
}

export interface BookmarkView {
  id: string;
  itemId: string;
  itemType: StudyItemType;
  title: string;
  summary: string;
  spaceId: string;
  createdAt: Date;
}

interface ResolvedItem {
  title: string;
  summary: string;
  spaceId: string;
}

/**
 * Bookmark use cases.
 *
 * OOP: Association - bookmarks point at existing study items without owning them.
 */
export class BookmarkService {
  constructor(
    private readonly bookmarkRepository: BookmarkRepository,
    private readonly noteRepository: NoteRepository,
    private readonly quizRepository: QuizRepository,
    private readonly deckRepository: FlashcardDeckRepository,
  ) {}

  public async list(userId: string): Promise<BookmarkView[]> {
    const bookmarks = await this.bookmarkRepository.findByUser(userId);
    const views: BookmarkView[] = [];

    for (const bookmark of bookmarks) {
      const item = await this.resolveItem(bookmark.getItemType(), bookmark.getItemId());
      if (!item) {
        continue;
      }
      views.push({
        id: bookmark.getId(),
        itemId: bookmark.getItemId(),
        itemType: bookmark.getItemType(),
        title: item.title,
        summary: item.summary,
        spaceId: item.spaceId,
        createdAt: bookmark.getCreatedAt(),
      });
    }

    return views;
  }

  public async create(userId: string, input: CreateBookmarkInput): Promise<BookmarkView> {
    const item = await this.resolveItem(input.itemType, input.itemId);
    if (!item) {
      throw new NotFoundError('Study item not found');
    }

    const existing = await this.bookmarkRepository.findByUserAndItem(
      userId,
      input.itemId,
      input.itemType,
    );
    if (existing) {
      throw new ConflictError('This item is already bookmarked');
    }

    const bookmark = new Bookmark({
      userId,
      itemId: input.itemId,
      itemType: input.itemType,
    });
    const created = await this.bookmarkRepository.create(bookmark);

    return {
      id: created.getId(),
      itemId: created.getItemId(),
      itemType: created.getItemType(),
      title: item.title,
      summary: item.summary,
      spaceId: item.spaceId,
      createdAt: created.getCreatedAt(),
    };
  }

  public async delete(userId: string, bookmarkId: string): Promise<void> {
    const bookmark = await this.bookmarkRepository.findById(bookmarkId);
    if (!bookmark) {
      throw new NotFoundError('Bookmark not found');
    }
    if (bookmark.getUserId() !== userId) {
      throw new ForbiddenError('You do not own this bookmark');
    }

    const deleted = await this.bookmarkRepository.delete(bookmarkId);
    if (!deleted) {
      throw new NotFoundError('Bookmark not found');
    }
  }

  private async resolveItem(
    itemType: StudyItemType,
    itemId: string,
  ): Promise<ResolvedItem | null> {
    if (itemType === 'note') {
      const note = await this.noteRepository.findById(itemId);
      return note
        ? { title: note.getTitle(), summary: note.summary(), spaceId: note.getSpaceId() }
        : null;
    }
    if (itemType === 'quiz') {
      const quiz = await this.quizRepository.findById(itemId);
      return quiz
        ? { title: quiz.getTitle(), summary: quiz.summary(), spaceId: quiz.getSpaceId() }
        : null;
    }
    const deck = await this.deckRepository.findById(itemId);
    return deck
      ? { title: deck.getTitle(), summary: deck.summary(), spaceId: deck.getSpaceId() }
      : null;
  }
}
