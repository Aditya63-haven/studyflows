import { randomBytes } from 'crypto';
import { ForbiddenError, NotFoundError } from '../errors';
import { Note } from '../domain/entities/Note';
import { Quiz } from '../domain/entities/Quiz';
import { SharedLink, ShareableItemType } from '../domain/entities/SharedLink';
import { QuizAnswer, QuizGradeResult } from '../domain/interfaces/IGradable';
import { NoteRepository } from '../repositories/NoteRepository';
import { QuizRepository } from '../repositories/QuizRepository';
import { SharedLinkRepository } from '../repositories/SharedLinkRepository';

/**
 * Public sharing use cases.
 *
 * OOP: Adapter boundary - public link tokens are translated into domain items.
 * OOP: Association - SharedLink references a Note or Quiz by id and type.
 */
export class SharingService {
  constructor(
    private readonly sharedLinkRepository: SharedLinkRepository,
    private readonly noteRepository: NoteRepository,
    private readonly quizRepository: QuizRepository,
  ) {}

  public async shareNote(ownerId: string, noteId: string): Promise<SharedLink> {
    const note = await this.findOwnedNote(ownerId, noteId);
    return this.createLink(note.getId(), 'note', ownerId, note.makeShareable.bind(note), note);
  }

  public async shareQuiz(ownerId: string, quizId: string): Promise<SharedLink> {
    const quiz = await this.findOwnedQuiz(ownerId, quizId);
    return this.createLink(quiz.getId(), 'quiz', ownerId, quiz.makeShareable.bind(quiz), quiz);
  }

  public async revoke(ownerId: string, token: string): Promise<void> {
    const link = await this.findLink(token);
    if (link.getOwnerId() !== ownerId) {
      throw new ForbiddenError('You do not own this share link');
    }

    link.revoke();
    await this.sharedLinkRepository.update(link.getId(), link);

    const item = await this.findItem(link.getItemType(), link.getItemId());
    if (item && item.getShareToken() === token) {
      item.revokeSharing();
      await this.updateItem(item);
    }
  }

  public async getPublicNote(token: string): Promise<Note> {
    const link = await this.findLink(token);
    if (link.getItemType() !== 'note') {
      throw new NotFoundError('Shared note not found');
    }
    const note = await this.noteRepository.findById(link.getItemId());
    if (!note) {
      throw new NotFoundError('Shared note not found');
    }
    return note;
  }

  public async getPublicQuiz(token: string): Promise<Quiz> {
    const link = await this.findLink(token);
    if (link.getItemType() !== 'quiz') {
      throw new NotFoundError('Shared quiz not found');
    }
    const quiz = await this.quizRepository.findById(link.getItemId());
    if (!quiz) {
      throw new NotFoundError('Shared quiz not found');
    }
    return quiz;
  }

  public async attemptPublicQuiz(
    token: string,
    answers: QuizAnswer[],
  ): Promise<QuizGradeResult> {
    const quiz = await this.getPublicQuiz(token);
    return quiz.grade(answers);
  }

  private async createLink(
    itemId: string,
    itemType: ShareableItemType,
    ownerId: string,
    applyToken: (token: string) => void,
    item: Note | Quiz,
  ): Promise<SharedLink> {
    const token = randomBytes(18).toString('base64url');
    applyToken(token);
    await this.updateItem(item);

    const link = new SharedLink({
      token,
      itemId,
      itemType,
      ownerId,
    });
    return this.sharedLinkRepository.create(link);
  }

  private async findLink(token: string): Promise<SharedLink> {
    const link = await this.sharedLinkRepository.findByToken(token);
    if (!link || !link.isActive()) {
      throw new NotFoundError('Share link not found or expired');
    }
    return link;
  }

  private async findItem(
    itemType: ShareableItemType,
    itemId: string,
  ): Promise<Note | Quiz | null> {
    if (itemType === 'note') {
      return this.noteRepository.findById(itemId);
    }
    return this.quizRepository.findById(itemId);
  }

  private async updateItem(item: Note | Quiz): Promise<void> {
    if (item.itemType === 'note') {
      await this.noteRepository.update(item.getId(), item as Note);
    } else {
      await this.quizRepository.update(item.getId(), item as Quiz);
    }
  }

  private async findOwnedNote(ownerId: string, noteId: string): Promise<Note> {
    const note = await this.noteRepository.findById(noteId);
    if (!note) {
      throw new NotFoundError('Note not found');
    }
    if (note.getOwnerId() !== ownerId) {
      throw new ForbiddenError('You do not own this note');
    }
    return note;
  }

  private async findOwnedQuiz(ownerId: string, quizId: string): Promise<Quiz> {
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new NotFoundError('Quiz not found');
    }
    if (quiz.getOwnerId() !== ownerId) {
      throw new ForbiddenError('You do not own this quiz');
    }
    return quiz;
  }
}
