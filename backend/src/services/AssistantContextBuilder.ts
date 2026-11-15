import { Config } from '../config/Config';
import { AIContextDocument, AIContextNote } from '../domain/interfaces/IAIProvider';
import { DocumentChunk } from '../domain/entities/DocumentChunk';
import { Note } from '../domain/entities/Note';
import { StudyDocument } from '../domain/entities/StudyDocument';
import { ForbiddenError } from '../errors';
import { DocumentChunkRepository } from '../repositories/DocumentChunkRepository';
import { NoteRepository } from '../repositories/NoteRepository';
import { StudyDocumentRepository } from '../repositories/StudyDocumentRepository';
import { StudySpaceService } from './StudySpaceService';

export interface AssistantContext {
  spaceId: string | null;
  spaceName: string;
  spaceSubject: string;
  notes: AIContextNote[];
  documents: AIContextDocument[];
}

const CHUNK_KEYWORD_STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'also',
  'because',
  'before',
  'being',
  'between',
  'could',
  'does',
  'during',
  'from',
  'have',
  'into',
  'more',
  'most',
  'other',
  'should',
  'some',
  'such',
  'than',
  'that',
  'their',
  'there',
  'these',
  'they',
  'this',
  'those',
  'through',
  'under',
  'very',
  'were',
  'what',
  'when',
  'where',
  'which',
  'while',
  'with',
  'would',
  'your',
]);

/**
 * Builds a bounded, ownership-checked context for the AI assistant.
 *
 * OOP: SRP - resolves selected notes and documents and enforces context limits.
 * OOP: Encapsulation - callers receive only safe excerpts, never repository
 * documents.
 */
export class AssistantContextBuilder {
  constructor(
    private readonly spaceService: StudySpaceService,
    private readonly noteRepository: NoteRepository,
    private readonly documentRepository: StudyDocumentRepository,
    private readonly chunkRepository: DocumentChunkRepository,
    private readonly config: Config,
  ) {}

  public async build(
    userId: string,
    spaceId?: string | null,
    noteIds?: string[],
    documentIds?: string[],
    query?: string,
  ): Promise<AssistantContext> {
    if (!spaceId) {
      const notes = noteIds?.length ? await this.resolveNotesById(userId, noteIds) : [];
      const documents = documentIds?.length
        ? await this.resolveDocumentsById(userId, documentIds)
        : [];
      return this.buildContext(null, '', '', notes, documents, query);
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

    const documents = await this.resolveSpaceDocuments(
      userId,
      spaceId,
      documentIds,
    );

    return this.buildContext(
      space.getId(),
      space.getName(),
      space.getSubject(),
      selected,
      documents,
      query,
    );
  }

  private async buildContext(
    spaceId: string | null,
    spaceName: string,
    spaceSubject: string,
    notes: Note[],
    documents: StudyDocument[],
    query?: string,
  ): Promise<AssistantContext> {
    const limitedNotes = this.limitNotes(notes);
    const chunksByDocument = await this.loadChunks(documents);
    const remaining = Math.max(this.config.aiMaxContextChars - limitedNotes.used, 0);

    return {
      spaceId,
      spaceName,
      spaceSubject,
      notes: limitedNotes.items,
      documents: this.limitDocuments(documents, chunksByDocument, query, remaining),
    };
  }

  private async resolveSpaceDocuments(
    userId: string,
    spaceId: string,
    documentIds?: string[],
  ): Promise<StudyDocument[]> {
    if (!documentIds?.length) {
      return [];
    }

    const spaceDocuments = (await this.documentRepository.findBySpace(spaceId)).filter(
      (document) => document.getOwnerId() === userId,
    );
    const byId = new Map(spaceDocuments.map((document) => [document.getId(), document]));
    const selected: StudyDocument[] = [];

    for (const documentId of documentIds) {
      const document = byId.get(documentId);
      if (document) {
        if (document.getStatus() === 'ready') {
          selected.push(document);
        }
        continue;
      }
      const outsideSpace = await this.documentRepository.findById(documentId);
      if (outsideSpace && outsideSpace.getOwnerId() !== userId) {
        throw new ForbiddenError('You do not own one of the selected documents');
      }
    }

    return selected;
  }

  private async resolveDocumentsById(
    userId: string,
    documentIds: string[],
  ): Promise<StudyDocument[]> {
    const documents: StudyDocument[] = [];
    for (const documentId of documentIds) {
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        continue;
      }
      if (document.getOwnerId() !== userId) {
        throw new ForbiddenError('You do not own one of the selected documents');
      }
      if (document.getStatus() === 'ready') {
        documents.push(document);
      }
    }
    return documents;
  }

  private async loadChunks(
    documents: StudyDocument[],
  ): Promise<Map<string, DocumentChunk[]>> {
    const byDocument = new Map<string, DocumentChunk[]>();
    for (const document of documents) {
      const chunks = await this.chunkRepository.findByDocument(document.getId());
      byDocument.set(document.getId(), chunks);
    }
    return byDocument;
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

  private limitNotes(notes: Note[]): { items: AIContextNote[]; used: number } {
    const items: AIContextNote[] = [];
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
      items.push({
        id: note.getId(),
        title,
        content,
        tags: note.getTags(),
      });
      used += title.length + content.length + 32;
    }

    return { items, used };
  }

  private limitDocuments(
    documents: StudyDocument[],
    chunksByDocument: Map<string, DocumentChunk[]>,
    query: string | undefined,
    remainingBudget: number,
  ): AIContextDocument[] {
    if (documents.length === 0 || remainingBudget <= 0) {
      return [];
    }

    const keywords = AssistantContextBuilder.extractKeywords(query ?? '');
    const candidates = documents.flatMap((document) =>
      (chunksByDocument.get(document.getId()) ?? []).map((chunk) => ({
        document,
        chunk,
        score: AssistantContextBuilder.scoreChunk(document, chunk, keywords),
      })),
    );
    candidates.sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      if (left.document.getId() !== right.document.getId()) {
        return left.document.getId().localeCompare(right.document.getId());
      }
      return left.chunk.getChunkIndex() - right.chunk.getChunkIndex();
    });

    const budget = Math.min(this.config.aiMaxDocumentContextChars, remainingBudget);
    const perDocument = new Map<string, AIContextDocument>();
    const chunkCounts = new Map<string, number>();
    let used = 0;

    for (const candidate of candidates) {
      const documentId = candidate.document.getId();
      const selectedChunks = chunkCounts.get(documentId) ?? 0;
      if (selectedChunks >= 3) {
        continue;
      }

      const text = candidate.chunk.getText();
      const overhead = candidate.document.getOriginalName().length + 48;
      if (used + text.length + overhead > budget) {
        continue;
      }

      const contextDocument = perDocument.get(documentId) ?? {
        id: documentId,
        title: candidate.document.getOriginalName(),
        format: candidate.document.getFormat(),
        chunks: [],
      };
      contextDocument.chunks.push({
        id: candidate.chunk.getId(),
        text,
        pageNumber: candidate.chunk.getPageNumber(),
        section: candidate.chunk.getSection(),
      });
      perDocument.set(documentId, contextDocument);
      chunkCounts.set(documentId, selectedChunks + 1);
      used += text.length + overhead;
    }

    return documents
      .map((document) => perDocument.get(document.getId()))
      .filter((document): document is AIContextDocument => document !== undefined);
  }

  private static scoreChunk(
    document: StudyDocument,
    chunk: DocumentChunk,
    keywords: string[],
  ): number {
    if (keywords.length === 0) {
      return 0;
    }
    const title = document.getOriginalName().toLowerCase();
    const section = chunk.getSection()?.toLowerCase() ?? '';
    const text = chunk.getText().toLowerCase();
    return keywords.reduce((score, keyword) => {
      const titleMatch = title.includes(keyword) ? 5 : 0;
      const sectionMatch = section.includes(keyword) ? 3 : 0;
      const textMatches = text.split(keyword).length - 1;
      return score + titleMatch + sectionMatch + Math.min(textMatches, 4);
    }, 0);
  }

  private static extractKeywords(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 4 && !CHUNK_KEYWORD_STOP_WORDS.has(word));
    return [...new Set(words)];
  }
}
