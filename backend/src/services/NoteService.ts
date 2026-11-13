import { ForbiddenError, NotFoundError } from '../errors';
import { Note } from '../domain/entities/Note';
import { StudyFacade } from '../patterns/facade/StudyFacade';
import { BookmarkRepository } from '../repositories/BookmarkRepository';
import { NoteRepository } from '../repositories/NoteRepository';
import { SharedLinkRepository } from '../repositories/SharedLinkRepository';
import { StudySpaceRepository } from '../repositories/StudySpaceRepository';

export interface CreateNoteInput {
  title: string;
  content?: string;
  tags?: string[];
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  tags?: string[];
}

/**
 * Note use cases.
 *
 * OOP: SRP - note lifecycle and AI condensation.
 * OOP: DIP - repositories and StudyFacade are injected through the constructor.
 */
export class NoteService {
  constructor(
    private readonly noteRepository: NoteRepository,
    private readonly spaceRepository: StudySpaceRepository,
    private readonly studyFacade: StudyFacade,
    private readonly bookmarkRepository: BookmarkRepository,
    private readonly sharedLinkRepository: SharedLinkRepository,
  ) {}

  public async listBySpace(ownerId: string, spaceId: string): Promise<Note[]> {
    await this.ensureSpaceOwned(ownerId, spaceId);
    return this.noteRepository.findBySpace(spaceId);
  }

  public async create(ownerId: string, spaceId: string, input: CreateNoteInput): Promise<Note> {
    await this.ensureSpaceOwned(ownerId, spaceId);
    const note = new Note({
      ownerId,
      spaceId,
      title: input.title,
      content: input.content,
      tags: input.tags,
    });
    return this.noteRepository.create(note);
  }

  public async getOwned(ownerId: string, noteId: string): Promise<Note> {
    const note = await this.noteRepository.findById(noteId);
    if (!note) {
      throw new NotFoundError('Note not found');
    }
    if (note.getOwnerId() !== ownerId) {
      throw new ForbiddenError('You do not own this note');
    }
    return note;
  }

  public async update(
    ownerId: string,
    noteId: string,
    input: UpdateNoteInput,
  ): Promise<Note> {
    const note = await this.getOwned(ownerId, noteId);
    if (input.title !== undefined) {
      note.setTitle(input.title);
    }
    if (input.content !== undefined) {
      note.setContent(input.content);
    }
    if (input.tags !== undefined) {
      note.setTags(input.tags);
    }

    const updated = await this.noteRepository.update(noteId, note);
    if (!updated) {
      throw new NotFoundError('Note not found');
    }
    return updated;
  }

  public async delete(ownerId: string, noteId: string): Promise<void> {
    await this.getOwned(ownerId, noteId);
    await Promise.all([
      this.bookmarkRepository.deleteByItem(noteId, 'note'),
      this.sharedLinkRepository.deleteByItem(noteId, 'note'),
    ]);
    const deleted = await this.noteRepository.delete(noteId);
    if (!deleted) {
      throw new NotFoundError('Note not found');
    }
  }

  public async condense(ownerId: string, noteId: string): Promise<Note> {
    const note = await this.getOwned(ownerId, noteId);
    await this.studyFacade.condenseNote(note);
    const updated = await this.noteRepository.update(noteId, note);
    if (!updated) {
      throw new NotFoundError('Note not found');
    }
    return updated;
  }

  private async ensureSpaceOwned(ownerId: string, spaceId: string): Promise<void> {
    const space = await this.spaceRepository.findById(spaceId);
    if (!space) {
      throw new NotFoundError('Study space not found');
    }
    if (space.getOwnerId() !== ownerId) {
      throw new ForbiddenError('You do not own this study space');
    }
  }
}
