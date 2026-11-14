import { ForbiddenError, NotFoundError } from '../errors';
import { Note } from '../domain/entities/Note';
import { Quiz } from '../domain/entities/Quiz';
import { QuizAttempt } from '../domain/entities/QuizAttempt';
import { QuizAnswer } from '../domain/interfaces/IGradable';
import { QuestionFactory, QuestionFactoryInput } from '../patterns/factory/QuestionFactory';
import { StudyFacade } from '../patterns/facade/StudyFacade';
import { AiAccessService } from './AiAccessService';
import { AiRateLimiter } from './AiRateLimiter';
import { BookmarkRepository } from '../repositories/BookmarkRepository';
import { NoteRepository } from '../repositories/NoteRepository';
import { QuizAttemptRepository } from '../repositories/QuizAttemptRepository';
import { QuizRepository } from '../repositories/QuizRepository';
import { SharedLinkRepository } from '../repositories/SharedLinkRepository';
import { StudySpaceRepository } from '../repositories/StudySpaceRepository';

export interface CreateQuizInput {
  title: string;
  description?: string;
  questions: QuestionFactoryInput[];
  timeLimitMinutes?: number | null;
}

export interface UpdateQuizInput {
  title?: string;
  description?: string;
  questions?: QuestionFactoryInput[];
  timeLimitMinutes?: number | null;
}

/**
 * Quiz authoring and attempt use cases.
 *
 * OOP: SRP - quiz lifecycle, generation orchestration and attempt persistence.
 * OOP: Factory - questions are created through QuestionFactory.
 * OOP: DIP - repositories and StudyFacade are injected.
 */
export class QuizService {
  constructor(
    private readonly quizRepository: QuizRepository,
    private readonly noteRepository: NoteRepository,
    private readonly spaceRepository: StudySpaceRepository,
    private readonly attemptRepository: QuizAttemptRepository,
    private readonly studyFacade: StudyFacade,
    private readonly bookmarkRepository: BookmarkRepository,
    private readonly sharedLinkRepository: SharedLinkRepository,
    private readonly aiAccessService: AiAccessService,
    private readonly rateLimiter: AiRateLimiter,
  ) {}

  public async listBySpace(ownerId: string, spaceId: string): Promise<Quiz[]> {
    await this.ensureSpaceOwned(ownerId, spaceId);
    return this.quizRepository.findBySpace(spaceId);
  }

  public async create(ownerId: string, spaceId: string, input: CreateQuizInput): Promise<Quiz> {
    await this.ensureSpaceOwned(ownerId, spaceId);
    const quiz = new Quiz({
      ownerId,
      spaceId,
      title: input.title,
      description: input.description,
      timeLimitMinutes: input.timeLimitMinutes,
    });
    quiz.setQuestions(input.questions.map((question) => QuestionFactory.create(question)));
    return this.quizRepository.create(quiz);
  }

  public async getOwned(ownerId: string, quizId: string): Promise<Quiz> {
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new NotFoundError('Quiz not found');
    }
    if (quiz.getOwnerId() !== ownerId) {
      throw new ForbiddenError('You do not own this quiz');
    }
    return quiz;
  }

  public async update(
    ownerId: string,
    quizId: string,
    input: UpdateQuizInput,
  ): Promise<Quiz> {
    const quiz = await this.getOwned(ownerId, quizId);
    if (input.title !== undefined) {
      quiz.setTitle(input.title);
    }
    if (input.description !== undefined) {
      quiz.setDescription(input.description);
    }
    if (input.timeLimitMinutes !== undefined) {
      quiz.setTimeLimitMinutes(input.timeLimitMinutes);
    }
    if (input.questions !== undefined) {
      quiz.setQuestions(input.questions.map((question) => QuestionFactory.create(question)));
    }

    const updated = await this.quizRepository.update(quizId, quiz);
    if (!updated) {
      throw new NotFoundError('Quiz not found');
    }
    return updated;
  }

  public async delete(ownerId: string, quizId: string): Promise<void> {
    await this.getOwned(ownerId, quizId);
    await Promise.all([
      this.attemptRepository.deleteByQuiz(quizId),
      this.bookmarkRepository.deleteByItem(quizId, 'quiz'),
      this.sharedLinkRepository.deleteByItem(quizId, 'quiz'),
    ]);
    const deleted = await this.quizRepository.delete(quizId);
    if (!deleted) {
      throw new NotFoundError('Quiz not found');
    }
  }

  public async take(
    userId: string,
    quizId: string,
    answers: QuizAnswer[],
  ): Promise<QuizAttempt> {
    const quiz = await this.getOwned(userId, quizId);
    const attempt = await this.studyFacade.gradeAndRecordAttempt(quiz, userId, answers);
    return this.attemptRepository.create(attempt);
  }

  public async listAttempts(userId: string, quizId: string): Promise<QuizAttempt[]> {
    await this.getOwned(userId, quizId);
    return this.attemptRepository.findByUserAndQuiz(userId, quizId);
  }

  public async generateFromNote(ownerId: string, noteId: string): Promise<Quiz> {
    const note = await this.findOwnedNote(ownerId, noteId);
    await this.aiAccessService.assertAccess(ownerId);
    this.rateLimiter.consume(ownerId);
    const quiz = await this.studyFacade.generateQuizFromNote(note);
    return this.quizRepository.create(quiz);
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
