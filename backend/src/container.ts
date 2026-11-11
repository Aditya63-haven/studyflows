import { Config } from './config/Config';
import { IAIProvider } from './domain/interfaces/IAIProvider';
import { IRevisionStrategy } from './domain/interfaces/IRevisionStrategy';
import { ExternalAIProvider } from './patterns/adapter/ExternalAIProvider';
import { MockAIProvider } from './patterns/adapter/MockAIProvider';
import { StudyFacade } from './patterns/facade/StudyFacade';
import { EventBus } from './patterns/observer/EventBus';
import { SM2Strategy } from './patterns/strategy/SM2Strategy';
import { SimpleMemoryStrengthStrategy } from './patterns/strategy/SimpleMemoryStrengthStrategy';
import { BookmarkRepository } from './repositories/BookmarkRepository';
import { ExamPlanRepository } from './repositories/ExamPlanRepository';
import { FlashcardDeckRepository } from './repositories/FlashcardDeckRepository';
import { NoteRepository } from './repositories/NoteRepository';
import { QuizAttemptRepository } from './repositories/QuizAttemptRepository';
import { QuizRepository } from './repositories/QuizRepository';
import { RevisionScheduleRepository } from './repositories/RevisionScheduleRepository';
import { SharedLinkRepository } from './repositories/SharedLinkRepository';
import { StudySessionRepository } from './repositories/StudySessionRepository';
import { StudySpaceRepository } from './repositories/StudySpaceRepository';
import { UserRepository } from './repositories/UserRepository';
import { AnalyticsService } from './services/AnalyticsService';
import { AuthService } from './services/AuthService';
import { BookmarkService } from './services/BookmarkService';
import { ExamPlanService } from './services/ExamPlanService';
import { FlashcardService } from './services/FlashcardService';
import { NoteService } from './services/NoteService';
import { QuizService } from './services/QuizService';
import { RevisionService } from './services/RevisionService';
import { SearchService } from './services/SearchService';
import { SharingService } from './services/SharingService';
import { StudySessionService } from './services/StudySessionService';
import { StudySpaceService } from './services/StudySpaceService';

export interface AppContainer {
  config: Config;
  eventBus: EventBus;
  authService: AuthService;
  studySpaceService: StudySpaceService;
  noteService: NoteService;
  quizService: QuizService;
  flashcardService: FlashcardService;
  revisionService: RevisionService;
  examPlanService: ExamPlanService;
  analyticsService: AnalyticsService;
  sharingService: SharingService;
  bookmarkService: BookmarkService;
  searchService: SearchService;
  studySessionService: StudySessionService;
}

const createRevisionStrategy = (config: Config): IRevisionStrategy =>
  config.revisionStrategy === 'simple'
    ? new SimpleMemoryStrengthStrategy()
    : new SM2Strategy();

const createAIProvider = (config: Config): IAIProvider => {
  if (config.aiProvider === 'external') {
    if (!config.aiBaseUrl || !config.aiApiKey) {
      throw new Error(
        '[Config] AI_BASE_URL and AI_API_KEY are required when AI_PROVIDER=external',
      );
    }
    return new ExternalAIProvider(config.aiBaseUrl, config.aiApiKey);
  }
  return new MockAIProvider();
};

/**
 * Composition root.
 *
 * OOP: DIP - all concrete classes are constructed once here and injected as
 * abstractions into services and controllers.
 */
export const createContainer = (): AppContainer => {
  const config = Config.getInstance();

  const userRepository = new UserRepository();
  const spaceRepository = new StudySpaceRepository();
  const noteRepository = new NoteRepository();
  const quizRepository = new QuizRepository();
  const attemptRepository = new QuizAttemptRepository();
  const deckRepository = new FlashcardDeckRepository();
  const revisionRepository = new RevisionScheduleRepository();
  const examPlanRepository = new ExamPlanRepository();
  const sessionRepository = new StudySessionRepository();
  const sharedLinkRepository = new SharedLinkRepository();
  const bookmarkRepository = new BookmarkRepository();

  const revisionStrategy = createRevisionStrategy(config);
  const eventBus = new EventBus();
  const analyticsService = new AnalyticsService(
    sessionRepository,
    attemptRepository,
    revisionRepository,
    quizRepository,
  );
  const revisionService = new RevisionService(revisionRepository, revisionStrategy);

  eventBus.subscribe('quiz.completed', analyticsService);
  eventBus.subscribe('quiz.completed', revisionService);

  const studyFacade = new StudyFacade({
    aiProvider: createAIProvider(config),
    revisionStrategy,
    eventBus,
  });

  return {
    config,
    eventBus,
    authService: new AuthService(userRepository, config),
    studySpaceService: new StudySpaceService(
      spaceRepository,
      noteRepository,
      quizRepository,
      deckRepository,
    ),
    noteService: new NoteService(noteRepository, spaceRepository, studyFacade),
    quizService: new QuizService(
      quizRepository,
      noteRepository,
      spaceRepository,
      attemptRepository,
      studyFacade,
    ),
    flashcardService: new FlashcardService(
      deckRepository,
      spaceRepository,
      revisionStrategy,
    ),
    revisionService,
    examPlanService: new ExamPlanService(examPlanRepository),
    analyticsService,
    sharingService: new SharingService(
      sharedLinkRepository,
      noteRepository,
      quizRepository,
    ),
    bookmarkService: new BookmarkService(
      bookmarkRepository,
      noteRepository,
      quizRepository,
      deckRepository,
    ),
    searchService: new SearchService(noteRepository, quizRepository, deckRepository),
    studySessionService: new StudySessionService(sessionRepository, spaceRepository),
  };
};
