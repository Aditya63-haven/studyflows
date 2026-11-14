import { ForbiddenError, NotFoundError } from '../errors';
import { StudySpace } from '../domain/entities/StudySpace';
import { IDocumentStorage } from '../domain/interfaces/IDocumentStorage';
import { BookmarkRepository } from '../repositories/BookmarkRepository';
import { DocumentChunkRepository } from '../repositories/DocumentChunkRepository';
import { StudyDocumentRepository } from '../repositories/StudyDocumentRepository';
import { FlashcardDeckRepository } from '../repositories/FlashcardDeckRepository';
import { NoteRepository } from '../repositories/NoteRepository';
import { QuizAttemptRepository } from '../repositories/QuizAttemptRepository';
import { QuizRepository } from '../repositories/QuizRepository';
import { SharedLinkRepository } from '../repositories/SharedLinkRepository';
import { StudySpaceRepository } from '../repositories/StudySpaceRepository';

export interface CreateStudySpaceInput {
  name: string;
  subject: string;
  description?: string;
  color?: string;
}

export type UpdateStudySpaceInput = Partial<CreateStudySpaceInput>;

/**
 * Study space use cases.
 *
 * OOP: SRP - owns only workspace lifecycle and ownership rules.
 * OOP: Aggregation management - deleting a space also cleans aggregated items.
 */
export class StudySpaceService {
  constructor(
    private readonly spaceRepository: StudySpaceRepository,
    private readonly noteRepository: NoteRepository,
    private readonly quizRepository: QuizRepository,
    private readonly deckRepository: FlashcardDeckRepository,
    private readonly attemptRepository: QuizAttemptRepository,
    private readonly bookmarkRepository: BookmarkRepository,
    private readonly sharedLinkRepository: SharedLinkRepository,
    private readonly documentRepository: StudyDocumentRepository,
    private readonly documentChunkRepository: DocumentChunkRepository,
    private readonly documentStorage: IDocumentStorage,
  ) {}

  public async create(ownerId: string, input: CreateStudySpaceInput): Promise<StudySpace> {
    const space = new StudySpace({
      ownerId,
      name: input.name,
      subject: input.subject,
      description: input.description,
      color: input.color,
    });
    return this.spaceRepository.create(space);
  }

  public list(ownerId: string): Promise<StudySpace[]> {
    return this.spaceRepository.findByOwner(ownerId);
  }

  public async getOwned(ownerId: string, spaceId: string): Promise<StudySpace> {
    const space = await this.spaceRepository.findById(spaceId);
    if (!space) {
      throw new NotFoundError('Study space not found');
    }
    if (space.getOwnerId() !== ownerId) {
      throw new ForbiddenError('You do not own this study space');
    }
    return space;
  }

  public async update(
    ownerId: string,
    spaceId: string,
    input: UpdateStudySpaceInput,
  ): Promise<StudySpace> {
    const space = await this.getOwned(ownerId, spaceId);
    if (input.name !== undefined) {
      space.setName(input.name);
    }
    if (input.subject !== undefined) {
      space.setSubject(input.subject);
    }
    if (input.description !== undefined) {
      space.setDescription(input.description);
    }
    if (input.color !== undefined) {
      space.setColor(input.color);
    }

    const updated = await this.spaceRepository.update(spaceId, space);
    if (!updated) {
      throw new NotFoundError('Study space not found');
    }
    return updated;
  }

  public async delete(ownerId: string, spaceId: string): Promise<void> {
    await this.getOwned(ownerId, spaceId);
    const [notes, quizzes, decks, documents] = await Promise.all([
      this.noteRepository.findBySpace(spaceId),
      this.quizRepository.findBySpace(spaceId),
      this.deckRepository.findBySpace(spaceId),
      this.documentRepository.findBySpace(spaceId),
    ]);

    const noteIds = notes.map((note) => note.getId());
    const quizIds = quizzes.map((quiz) => quiz.getId());
    const deckIds = decks.map((deck) => deck.getId());

    const bookmarkCleanups = [
      ...noteIds.map((noteId) => this.bookmarkRepository.deleteByItem(noteId, 'note')),
      ...quizIds.map((quizId) => this.bookmarkRepository.deleteByItem(quizId, 'quiz')),
      ...deckIds.map((deckId) => this.bookmarkRepository.deleteByItem(deckId, 'flashcarddeck')),
    ];

    await Promise.all(
      documents.map((document) => this.documentStorage.delete(document.getStorageKey())),
    );
    await Promise.all([
      this.noteRepository.deleteBySpace(spaceId),
      this.quizRepository.deleteBySpace(spaceId),
      this.deckRepository.deleteBySpace(spaceId),
      this.documentChunkRepository.deleteBySpace(spaceId),
      this.documentRepository.deleteBySpace(spaceId),
      ...quizIds.map((quizId) => this.attemptRepository.deleteByQuiz(quizId)),
      ...bookmarkCleanups,
      ...noteIds.map((noteId) => this.sharedLinkRepository.deleteByItem(noteId, 'note')),
      ...quizIds.map((quizId) => this.sharedLinkRepository.deleteByItem(quizId, 'quiz')),
    ]);
    const deleted = await this.spaceRepository.delete(spaceId);
    if (!deleted) {
      throw new NotFoundError('Study space not found');
    }
  }
}
