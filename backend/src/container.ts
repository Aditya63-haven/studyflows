import { Config } from './config/Config';
import { IAIProvider } from './domain/interfaces/IAIProvider';
import { IRevisionStrategy } from './domain/interfaces/IRevisionStrategy';
import { ExternalAIProvider } from './patterns/adapter/ExternalAIProvider';
import { MockAIProvider } from './patterns/adapter/MockAIProvider';
import { StudyFacade } from './patterns/facade/StudyFacade';
import { EventBus } from './patterns/observer/EventBus';
import { SM2Strategy } from './patterns/strategy/SM2Strategy';
import { SimpleMemoryStrengthStrategy } from './patterns/strategy/SimpleMemoryStrengthStrategy';
import { MoveToNextFreeSlotStrategy } from './patterns/strategy/MoveToNextFreeSlotStrategy';
import { MoveToWeekendStrategy } from './patterns/strategy/MoveToWeekendStrategy';
import { AvailabilityRepository } from './repositories/AvailabilityRepository';
import { BookmarkRepository } from './repositories/BookmarkRepository';
import { ExamPlanRepository } from './repositories/ExamPlanRepository';
import { FlashcardDeckRepository } from './repositories/FlashcardDeckRepository';
import { NoteRepository } from './repositories/NoteRepository';
import { NotificationRepository } from './repositories/NotificationRepository';
import { QuizAttemptRepository } from './repositories/QuizAttemptRepository';
import { QuizRepository } from './repositories/QuizRepository';
import { RevisionScheduleRepository } from './repositories/RevisionScheduleRepository';
import { SharedLinkRepository } from './repositories/SharedLinkRepository';
import { StudySessionRepository } from './repositories/StudySessionRepository';
import { StudySpaceRepository } from './repositories/StudySpaceRepository';
import { UserRepository } from './repositories/UserRepository';
import { AvatarService } from './services/AvatarService';
import { AnalyticsService } from './services/AnalyticsService';
import { AssistantService } from './services/AssistantService';
import { AttentionService } from './services/AttentionService';
import { AuthService } from './services/AuthService';
import { AvailabilityService } from './services/AvailabilityService';
import { BookmarkService } from './services/BookmarkService';
import { ExamPlanService } from './services/ExamPlanService';
import { FlashcardService } from './services/FlashcardService';
import { ImageProcessor } from './services/ImageProcessor';
import { NoteService } from './services/NoteService';
import { NotificationService } from './services/NotificationService';
import { QuizService } from './services/QuizService';
import { RevisionService } from './services/RevisionService';
import { SearchService } from './services/SearchService';
import { SharingService } from './services/SharingService';
import { StudySessionService } from './services/StudySessionService';
import { StudySpaceService } from './services/StudySpaceService';
import { LocalAvatarStorage } from './storage/LocalAvatarStorage';

export interface AppContainer {
  config: Config;
  eventBus: EventBus;
  authService: AuthService;
  avatarService: AvatarService;
  studySpaceService: StudySpaceService;
  noteService: NoteService;
  quizService: QuizService;
  flashcardService: FlashcardService;
  revisionService: RevisionService;
  examPlanService: ExamPlanService;
  availabilityService: AvailabilityService;
  analyticsService: AnalyticsService;
  notificationService: NotificationService;
  attentionService: AttentionService;
  assistantService: AssistantService;
  sharingService: SharingService;
  bookmarkService: BookmarkService;
  searchService: SearchService;
  studySessionService: StudySessionService;
}

const createRevisionStrategy = (config: Config): IRevisionStrategy =>
  config.revisionStrategy === 'simple' ? new SimpleMemoryStrengthStrategy() : new SM2Strategy();

const createAIProvider = (config: Config): IAIProvider => {
  if (config.aiProvider === 'external') {
    if (!config.aiBaseUrl || !config.aiApiKey) {
      throw new Error('[Config] AI_BASE_URL and AI_API_KEY are required when AI_PROVIDER=external');
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
  const avatarStorage = new LocalAvatarStorage(config.avatarStorageDir);
  const avatarService = new AvatarService(userRepository, avatarStorage, new ImageProcessor());
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
  const availabilityRepository = new AvailabilityRepository();
  const notificationRepository = new NotificationRepository();

  const revisionStrategy = createRevisionStrategy(config);
  const eventBus = new EventBus();
  const analyticsService = new AnalyticsService(
    sessionRepository,
    attemptRepository,
    revisionRepository,
    quizRepository,
  );
  const revisionService = new RevisionService(revisionRepository, revisionStrategy);
  const notificationService = new NotificationService(notificationRepository);
  const availabilityService = new AvailabilityService(availabilityRepository);

  const rescheduleStrategies = {
    'next-free-slot': new MoveToNextFreeSlotStrategy(),
    weekend: new MoveToWeekendStrategy(),
  };

  const attentionService = new AttentionService(
    examPlanRepository,
    revisionRepository,
    availabilityRepository,
    rescheduleStrategies,
    eventBus,
  );

  eventBus.subscribe('quiz.completed', analyticsService);
  eventBus.subscribe('quiz.completed', revisionService);
  eventBus.subscribe('quiz.completed', notificationService);
  eventBus.subscribe('session.missed', notificationService);
  eventBus.subscribe('exam.approaching', notificationService);
  eventBus.subscribe('revision.due', notificationService);

  const aiProvider = createAIProvider(config);
  const studyFacade = new StudyFacade({
    aiProvider,
    revisionStrategy,
    eventBus,
  });

  return {
    config,
    eventBus,
    authService: new AuthService(userRepository, config),
    avatarService,
    studySpaceService: new StudySpaceService(
      spaceRepository,
      noteRepository,
      quizRepository,
      deckRepository,
      attemptRepository,
      bookmarkRepository,
      sharedLinkRepository,
    ),
    noteService: new NoteService(
      noteRepository,
      spaceRepository,
      studyFacade,
      bookmarkRepository,
      sharedLinkRepository,
    ),
    quizService: new QuizService(
      quizRepository,
      noteRepository,
      spaceRepository,
      attemptRepository,
      studyFacade,
      bookmarkRepository,
      sharedLinkRepository,
    ),
    flashcardService: new FlashcardService(
      deckRepository,
      spaceRepository,
      revisionStrategy,
      bookmarkRepository,
    ),
    revisionService,
    examPlanService: new ExamPlanService(examPlanRepository, availabilityRepository),
    availabilityService,
    analyticsService,
    notificationService,
    attentionService,
    assistantService: new AssistantService(
      aiProvider,
      examPlanRepository,
      spaceRepository,
      attentionService,
    ),
    sharingService: new SharingService(sharedLinkRepository, noteRepository, quizRepository),
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
