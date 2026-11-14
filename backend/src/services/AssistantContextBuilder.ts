import { Config } from '../config/Config';
import { Note } from '../domain/entities/Note';
import { AIContextNote } from '../domain/interfaces/IAIProvider';
import { ForbiddenError } from '../errors';
import { NoteRepository } from '../repositories/NoteRepository';
import { StudySpaceService } from './StudySpaceService';

export interface AssistantContext {
  spaceId: string | null;
  spaceName: string;
  spaceSubject: string;
  notes: AIContextNote[];
}

/**
 * Builds a bounded, ownership-checked note context for the AI assistant.
 *
 * OOP: SRP - resolves selected notes and enforces context size limits.
 * OOP: Encapsulation - callers receive only safe note excerpts, never repository
 * documents.
 */
export class AssistantContextBuilder {
  constructor(
    private readonly spaceService: StudySpaceService,
    private readonly noteRepository: NoteRepository,
    private readonly config: Config,
  ) {}

  public async build(
    userId: string,
    spaceId?: string | null,
    noteIds?: string[],
  ): Promise<AssistantContext> {
    if (!spaceId) {
      const notes = noteIds?.length ? await this.resolveNotesById(userId, noteIds) : [];
      return {
        spaceId: null,
        spaceName: '',
        spaceSubject: '',
        notes: this.limitNotes(notes),
      };
    }

    const space = await this.spaceService.getOwned(userId, spaceId);
    const spaceNotes = (await this.noteRepository.findBySpace(spaceId)).filter(
      (note) => note.getOwnerId() === userId,
    );

    let selected: Note[];
    if (noteIds === undefined) {
      selected = [...spaceNotes].sort(
        (left, right) => right.getUpdatedAt().getTime() - left.getUpdatedAt().getTime(),
      );
    } else {
      const byId = new Map(spaceNotes.map((note) => [note.getId(), note]));
      selected = [];
      for (const noteId of noteIds) {
        const note = byId.get(noteId);
        if (note) {
          selected.push(note);
          continue;
        }
        const outsideSpace = await this.noteRepository.findById(noteId);
        if (outsideSpace && outsideSpace.getOwnerId() !== userId) {
          throw new ForbiddenError('You do not own one of the selected notes');
        }
      }
    }

    return {
      spaceId: space.getId(),
      spaceName: space.getName(),
      spaceSubject: space.getSubject(),
      notes: this.limitNotes(selected),
    };
  }

  private async resolveNotesById(userId: string, noteIds: string[]): Promise<Note[]> {
    const notes: Note[] = [];
    for (const noteId of noteIds) {
      const note = await this.noteRepository.findById(noteId);
      if (!note) {
        continue;
      }
      if (note.getOwnerId() !== userId) {
        throw new ForbiddenError('You do not own one of the selected notes');
      }
      notes.push(note);
    }
    return notes;
  }

  private limitNotes(notes: Note[]): AIContextNote[] {
    const result: AIContextNote[] = [];
    let used = 0;

    for (const note of notes) {
      const title = note.getTitle();
      const remaining = this.config.aiMaxContextChars - used;
      const contentBudget = Math.min(this.config.aiMaxNoteChars, remaining - title.length - 32);
      if (contentBudget <= 0) {
        break;
      }
      const content = note.getContent().slice(0, contentBudget);
      if (content.length === 0) {
        continue;
      }
      result.push({
        id: note.getId(),
        title,
        content,
        tags: note.getTags(),
      });
      used += title.length + content.length + 32;
    }

    return result;
  }
}
