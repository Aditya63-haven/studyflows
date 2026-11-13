import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Config } from './config/Config';
import { Database } from './config/Database';
import { addDays, startOfDay } from './domain/base/helpers';
import { DayAvailability } from './domain/entities/DayAvailability';
import { ExamPlan } from './domain/entities/ExamPlan';
import { Flashcard } from './domain/entities/Flashcard';
import { FlashcardDeck } from './domain/entities/FlashcardDeck';
import { Note } from './domain/entities/Note';
import { Quiz } from './domain/entities/Quiz';
import { QuizAnswer } from './domain/interfaces/IGradable';
import { QuizAttempt } from './domain/entities/QuizAttempt';
import { RevisionSchedule } from './domain/entities/RevisionSchedule';
import { SharedLink } from './domain/entities/SharedLink';
import { StudentAvailability } from './domain/entities/StudentAvailability';
import { StudyDay } from './domain/entities/StudyDay';
import { StudySession } from './domain/entities/StudySession';
import { StudySpace } from './domain/entities/StudySpace';
import { Topic } from './domain/entities/Topic';
import { User } from './domain/entities/User';
import { QuestionFactory } from './patterns/factory/QuestionFactory';
import { ExamPlanBuilder } from './patterns/builder/ExamPlanBuilder';
import { AvailabilityModel } from './persistence/schemas/availability.schema';
import { BookmarkModel } from './persistence/schemas/bookmark.schema';
import { ExamPlanModel } from './persistence/schemas/examPlan.schema';
import { FlashcardDeckModel } from './persistence/schemas/flashcardDeck.schema';
import { NoteModel } from './persistence/schemas/note.schema';
import { NotificationModel } from './persistence/schemas/notification.schema';
import { QuizAttemptModel } from './persistence/schemas/quizAttempt.schema';
import { QuizModel } from './persistence/schemas/quiz.schema';
import { RevisionScheduleModel } from './persistence/schemas/revisionSchedule.schema';
import { SharedLinkModel } from './persistence/schemas/sharedLink.schema';
import { StudySessionModel } from './persistence/schemas/studySession.schema';
import { StudySpaceModel } from './persistence/schemas/studySpace.schema';
import { UserModel } from './persistence/schemas/user.schema';
import { AvailabilityRepository } from './repositories/AvailabilityRepository';
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

const DEMO_USER_ID = 'seed-user-demo';
const DEMO_EMAIL = 'demo@studyflows.dev';
const DEMO_PASSWORD = 'studyflows123';

const DSA_SPACE_ID = 'seed-space-dsa';
const DBMS_SPACE_ID = 'seed-space-dbms';
const DSA_QUIZ_ID = 'seed-quiz-dsa';
const DBMS_QUIZ_ID = 'seed-quiz-dbms';
const DSA_DECK_ID = 'seed-deck-dsa';
const DBMS_DECK_ID = 'seed-deck-dbms';

const ARRAYS_TOPIC_ID = 'seed-topic-arrays';
const TREES_TOPIC_ID = 'seed-topic-trees';
const NORMALIZATION_TOPIC_ID = 'seed-topic-normalization';
const SQL_JOINS_TOPIC_ID = 'seed-topic-sql-joins';
const INDEXING_TOPIC_ID = 'seed-topic-indexing';

const cleanupDemoData = async (userId: string): Promise<void> => {
  await Promise.all([
    BookmarkModel.deleteMany({ owner: userId }).exec(),
    SharedLinkModel.deleteMany({ owner: userId }).exec(),
    StudySessionModel.deleteMany({ owner: userId }).exec(),
    RevisionScheduleModel.deleteMany({ owner: userId }).exec(),
    QuizAttemptModel.deleteMany({ owner: userId }).exec(),
    ExamPlanModel.deleteMany({ owner: userId }).exec(),
    FlashcardDeckModel.deleteMany({ owner: userId }).exec(),
    QuizModel.deleteMany({ owner: userId }).exec(),
    NoteModel.deleteMany({ owner: userId }).exec(),
    StudySpaceModel.deleteMany({ owner: userId }).exec(),
    AvailabilityModel.deleteMany({ owner: userId }).exec(),
    NotificationModel.deleteMany({ owner: userId }).exec(),
  ]);
};

const buildDsaQuiz = (ownerId: string): Quiz =>
  new Quiz({
    id: DSA_QUIZ_ID,
    ownerId,
    spaceId: DSA_SPACE_ID,
    title: 'Data Structures Fundamentals',
    description: 'A short mixed-format quiz covering arrays, lists and queues.',
    timeLimitMinutes: 10,
    questions: [
      QuestionFactory.create({
        id: 'seed-q-dsa-mcq',
        type: 'mcq',
        prompt: 'Which data structure follows first-in, first-out ordering?',
        points: 2,
        options: [
          { id: 'a', text: 'Stack' },
          { id: 'b', text: 'Queue' },
          { id: 'c', text: 'Binary tree' },
        ],
        correctOptionId: 'b',
        explanation: 'A queue removes items in the same order they arrived.',
      }),
      QuestionFactory.create({
        id: 'seed-q-dsa-multi',
        type: 'multi_select',
        prompt: 'Which operations are commonly O(1) for a hash table?',
        points: 2,
        options: [
          { id: 'a', text: 'Average-case lookup' },
          { id: 'b', text: 'Sorting all keys' },
          { id: 'c', text: 'Average-case insertion' },
        ],
        correctOptionIds: ['a', 'c'],
        explanation: 'Hash tables provide average-case constant-time lookup and insertion.',
      }),
      QuestionFactory.create({
        id: 'seed-q-dsa-tf',
        type: 'true_false',
        prompt: 'Binary search requires the input array to be sorted.',
        points: 1,
        correctAnswer: true,
        explanation: 'Binary search discards half the search space using ordering.',
      }),
    ],
  });

const buildDbmsQuiz = (ownerId: string): Quiz =>
  new Quiz({
    id: DBMS_QUIZ_ID,
    ownerId,
    spaceId: DBMS_SPACE_ID,
    title: 'Database Design Review',
    description: 'Normalization, keys and transaction basics.',
    timeLimitMinutes: 12,
    questions: [
      QuestionFactory.create({
        id: 'seed-q-dbms-mcq',
        type: 'mcq',
        prompt: 'Which normal form removes transitive dependencies?',
        points: 2,
        options: [
          { id: 'a', text: '1NF' },
          { id: 'b', text: '3NF' },
          { id: 'c', text: 'BCNF' },
        ],
        correctOptionId: 'b',
        explanation: 'Third normal form removes transitive dependencies on non-key attributes.',
      }),
      QuestionFactory.create({
        id: 'seed-q-dbms-multi',
        type: 'multi_select',
        prompt: 'Which properties belong to ACID transactions?',
        points: 2,
        options: [
          { id: 'a', text: 'Atomicity' },
          { id: 'b', text: 'Isolation' },
          { id: 'c', text: 'Normalization' },
        ],
        correctOptionIds: ['a', 'b'],
        explanation: 'ACID stands for atomicity, consistency, isolation and durability.',
      }),
      QuestionFactory.create({
        id: 'seed-q-dbms-tf',
        type: 'true_false',
        prompt: 'A primary key may contain duplicate values.',
        points: 1,
        correctAnswer: false,
        explanation: 'Primary keys are unique by definition.',
      }),
    ],
  });

const buildDsaDeck = (ownerId: string, now: Date): FlashcardDeck =>
  new FlashcardDeck({
    id: DSA_DECK_ID,
    ownerId,
    spaceId: DSA_SPACE_ID,
    title: 'Core Data Structures',
    description: 'Quick recall cards for common structures.',
    cards: [
      new Flashcard({
        id: 'seed-card-dsa-1',
        front: 'What is the time complexity of binary search?',
        back: 'O(log n) for a sorted array.',
      }),
      new Flashcard({
        id: 'seed-card-dsa-2',
        front: 'Which structure uses LIFO ordering?',
        back: 'A stack.',
        easeFactor: 2.4,
        intervalDays: 3,
        reviewCount: 2,
        lastReviewedAt: addDays(now, -2),
        nextReviewAt: addDays(now, 1),
      }),
      new Flashcard({
        id: 'seed-card-dsa-3',
        front: 'What does a linked list node store?',
        back: 'A value and a reference to the next node.',
        easeFactor: 2.6,
        intervalDays: 7,
        reviewCount: 4,
        lastReviewedAt: addDays(now, -1),
        nextReviewAt: addDays(now, 6),
      }),
    ],
  });

const buildDbmsDeck = (ownerId: string, now: Date): FlashcardDeck =>
  new FlashcardDeck({
    id: DBMS_DECK_ID,
    ownerId,
    spaceId: DBMS_SPACE_ID,
    title: 'SQL and Normalization',
    description: 'Definitions and rules worth revisiting.',
    cards: [
      new Flashcard({
        id: 'seed-card-dbms-1',
        front: 'What is a foreign key?',
        back: 'An attribute that references a primary key in another table.',
      }),
      new Flashcard({
        id: 'seed-card-dbms-2',
        front: 'What does 2NF remove?',
        back: 'Partial dependencies on part of a composite key.',
        easeFactor: 2.3,
        intervalDays: 2,
        reviewCount: 1,
        lastReviewedAt: addDays(now, -3),
        nextReviewAt: now,
      }),
      new Flashcard({
        id: 'seed-card-dbms-3',
        front: 'What is a transaction rollback?',
        back: 'Undoing uncommitted changes after a failure.',
        easeFactor: 2.5,
        intervalDays: 5,
        reviewCount: 3,
        lastReviewedAt: addDays(now, -2),
        nextReviewAt: addDays(now, 4),
      }),
    ],
  });

const seed = async (): Promise<void> => {
  const config = Config.getInstance();
  await Database.getInstance().connect(config.mongodbUri);

  try {
    const existingUser = await UserModel.findOne({ email: DEMO_EMAIL }).lean().exec();
    if (existingUser) {
      await cleanupDemoData(existingUser._id);
    }
    await cleanupDemoData(DEMO_USER_ID);
    await UserModel.deleteOne({ _id: DEMO_USER_ID }).exec();
    await UserModel.deleteOne({ email: DEMO_EMAIL }).exec();

    const userRepository = new UserRepository();
    const spaceRepository = new StudySpaceRepository();
    const noteRepository = new NoteRepository();
    const quizRepository = new QuizRepository();
    const attemptRepository = new QuizAttemptRepository();
    const deckRepository = new FlashcardDeckRepository();
    const revisionRepository = new RevisionScheduleRepository();
    const examPlanRepository = new ExamPlanRepository();
    const sessionRepository = new StudySessionRepository();
    const availabilityRepository = new AvailabilityRepository();
    const sharedLinkRepository = new SharedLinkRepository();

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const user = await userRepository.create(
      new User({
        id: DEMO_USER_ID,
        name: 'Demo Student',
        email: DEMO_EMAIL,
        passwordHash,
      }),
    );

    const now = new Date();
    const today = startOfDay(now);

    await Promise.all([
      spaceRepository.create(
        new StudySpace({
          id: DSA_SPACE_ID,
          ownerId: user.getId(),
          name: 'Data Structures',
          subject: 'Computer Science',
          description: 'Arrays, lists, trees and algorithm practice.',
          color: '#6366f1',
        }),
      ),
      spaceRepository.create(
        new StudySpace({
          id: DBMS_SPACE_ID,
          ownerId: user.getId(),
          name: 'Database Systems',
          subject: 'Information Systems',
          description: 'Database design, SQL and transactions.',
          color: '#0ea5e9',
        }),
      ),
    ]);

    await Promise.all([
      noteRepository.create(
        new Note({
          id: 'seed-note-dsa-bigo',
          ownerId: user.getId(),
          spaceId: DSA_SPACE_ID,
          title: 'Big-O Cheat Sheet',
          content:
            '## Common growth rates\n\n- O(1): constant access\n- O(log n): binary search\n- O(n): linear scan\n- O(n log n): efficient sorting\n- O(n^2): nested loops',
          aiSummary: 'Constant, logarithmic, linear, linearithmic and quadratic growth rates.',
          tags: ['complexity', 'algorithms'],
        }),
      ),
      noteRepository.create(
        new Note({
          id: 'seed-note-dsa-trees',
          ownerId: user.getId(),
          spaceId: DSA_SPACE_ID,
          title: 'Tree Traversals',
          content:
            'Preorder visits root first. Inorder visits left, root, right. Postorder visits children before the root. Level order uses a queue.',
          tags: ['trees', 'traversal'],
        }),
      ),
      noteRepository.create(
        new Note({
          id: 'seed-note-dbms-normalization',
          ownerId: user.getId(),
          spaceId: DBMS_SPACE_ID,
          title: 'Normalization Rules',
          content:
            '1NF requires atomic values. 2NF removes partial dependencies. 3NF removes transitive dependencies. BCNF strengthens 3NF for every determinant.',
          aiSummary: 'Normalization progressively removes redundancy and dependency anomalies.',
          tags: ['normalization', 'design'],
        }),
      ),
    ]);

    const dsaQuiz = buildDsaQuiz(user.getId());
    const dbmsQuiz = buildDbmsQuiz(user.getId());

    // Public read-only link for the shared quiz (usable without login).
    const shareToken = randomBytes(18).toString('base64url');
    dbmsQuiz.makeShareable(shareToken);

    // Weekly study availability: 2 hours on weekdays, more on weekends.
    const availability = new StudentAvailability({
      id: 'seed-availability',
      userId: user.getId(),
      days: [0, 1, 2, 3, 4].map(
        (weekday) => new DayAvailability({ weekday, budgetMinutes: 120, available: true }),
      ).concat([
        new DayAvailability({ weekday: 5, budgetMinutes: 240, available: true }),
        new DayAvailability({ weekday: 6, budgetMinutes: 180, available: true }),
      ]),
    });

    await Promise.all([
      quizRepository.create(dsaQuiz),
      quizRepository.create(dbmsQuiz),
      deckRepository.create(buildDsaDeck(user.getId(), now)),
      deckRepository.create(buildDbmsDeck(user.getId(), now)),
      sharedLinkRepository.create(
        new SharedLink({
          id: 'seed-share-dbms-quiz',
          token: shareToken,
          itemId: DBMS_QUIZ_ID,
          itemType: 'quiz',
          ownerId: user.getId(),
        }),
      ),
      availabilityRepository.create(availability),
      sessionRepository.create(
        new StudySession({
          id: 'seed-session-1',
          userId: user.getId(),
          spaceId: DSA_SPACE_ID,
          subject: 'Computer Science',
          durationMinutes: 50,
          startedAt: new Date(today.getTime() + 9 * 60 * 60 * 1000),
          endedAt: new Date(today.getTime() + 9 * 60 * 60 * 1000 + 50 * 60 * 1000),
        }),
      ),
      sessionRepository.create(
        new StudySession({
          id: 'seed-session-2',
          userId: user.getId(),
          spaceId: DBMS_SPACE_ID,
          subject: 'Information Systems',
          durationMinutes: 45,
          startedAt: new Date(addDays(today, -1).getTime() + 18 * 60 * 60 * 1000),
          endedAt: new Date(addDays(today, -1).getTime() + 18 * 60 * 60 * 1000 + 45 * 60 * 1000),
        }),
      ),
      sessionRepository.create(
        new StudySession({
          id: 'seed-session-3',
          userId: user.getId(),
          spaceId: DSA_SPACE_ID,
          subject: 'Computer Science',
          durationMinutes: 30,
          startedAt: new Date(addDays(today, -2).getTime() + 20 * 60 * 60 * 1000),
          endedAt: new Date(addDays(today, -2).getTime() + 20 * 60 * 60 * 1000 + 30 * 60 * 1000),
        }),
      ),
    ]);

    const dsaAnswers: QuizAnswer[] = [
      { questionId: 'seed-q-dsa-mcq', response: 'b' },
      { questionId: 'seed-q-dsa-multi', response: ['a', 'c'] },
      { questionId: 'seed-q-dsa-tf', response: true },
    ];
    const dbmsAnswers: QuizAnswer[] = [
      { questionId: 'seed-q-dbms-mcq', response: 'b' },
      { questionId: 'seed-q-dbms-multi', response: ['a'] },
      { questionId: 'seed-q-dbms-tf', response: false },
    ];

    await Promise.all([
      attemptRepository.create(
        new QuizAttempt({
          id: 'seed-attempt-dsa',
          quizId: dsaQuiz.getId(),
          userId: user.getId(),
          answers: dsaAnswers,
          result: dsaQuiz.grade(dsaAnswers),
          completedAt: addDays(today, -3),
        }),
      ),
      attemptRepository.create(
        new QuizAttempt({
          id: 'seed-attempt-dbms',
          quizId: dbmsQuiz.getId(),
          userId: user.getId(),
          answers: dbmsAnswers,
          result: dbmsQuiz.grade(dbmsAnswers),
          completedAt: addDays(today, -1),
        }),
      ),
    ]);

    const topics = [
      new Topic({
        id: ARRAYS_TOPIC_ID,
        name: 'Arrays and Strings',
        description: 'Two pointers, prefix sums and sliding windows.',
        estimatedMinutes: 45,
      }),
      new Topic({
        id: TREES_TOPIC_ID,
        name: 'Trees and Graphs',
        description: 'Traversal, search and shortest paths.',
        estimatedMinutes: 60,
      }),
      new Topic({
        id: NORMALIZATION_TOPIC_ID,
        name: 'Database Normalization',
        description: 'Functional dependencies and normal forms.',
        estimatedMinutes: 40,
      }),
    ];

    const examPlan: ExamPlan = new ExamPlanBuilder()
      .setName('Semester Finals')
      .setOwnerId(user.getId())
      .setExamDate(addDays(today, 14))
      .setDailyStudyHours(2)
      .setTopics(topics)
      .build(now);

    // Show progress: the first topic is already done.
    examPlan.markTopicComplete(ARRAYS_TOPIC_ID);

    // Simulate a missed study day: the first day is in the past and still has
    // unfinished topics, so it shows up under "needs attention".
    const builtDays = examPlan.getStudyDays();
    const firstDay = builtDays[0];
    examPlan.setStudyDays([
      new StudyDay({
        id: firstDay.getId(),
        date: addDays(today, -1),
        topicIds: firstDay.getTopicIds(),
        completedTopicIds: firstDay.getCompletedTopicIds(),
        plannedMinutes: firstDay.getPlannedMinutes(),
      }),
      ...builtDays.slice(1),
    ]);

    // A second plan whose exam is only two days away.
    const quizExamPlan: ExamPlan = new ExamPlanBuilder()
      .setName('Database Systems Quiz')
      .setOwnerId(user.getId())
      .setExamDate(addDays(today, 2))
      .setDailyStudyHours(1)
      .setTopics([
        new Topic({
          id: SQL_JOINS_TOPIC_ID,
          name: 'SQL Joins',
          description: 'Inner, outer and self joins.',
          estimatedMinutes: 45,
        }),
        new Topic({
          id: INDEXING_TOPIC_ID,
          name: 'Indexing and Query Plans',
          description: 'B-tree indexes and query optimization.',
          estimatedMinutes: 40,
        }),
      ])
      .build(now);

    await Promise.all([
      examPlanRepository.create(examPlan),
      examPlanRepository.create(quizExamPlan),
      revisionRepository.create(
        new RevisionSchedule({
          id: 'seed-revision-arrays',
          userId: user.getId(),
          topicId: ARRAYS_TOPIC_ID,
          topicName: 'Arrays and Strings',
          memoryStrength: 35,
          easeFactor: 2.3,
          intervalDays: 1,
          reviewCount: 2,
          lastReviewedAt: addDays(today, -1),
          nextReviewAt: today,
        }),
      ),
      revisionRepository.create(
        new RevisionSchedule({
          id: 'seed-revision-trees',
          userId: user.getId(),
          topicId: TREES_TOPIC_ID,
          topicName: 'Trees and Graphs',
          memoryStrength: 30,
          easeFactor: 2.1,
          intervalDays: 3,
          reviewCount: 1,
          lastReviewedAt: addDays(today, -3),
          nextReviewAt: addDays(today, 3),
        }),
      ),
      revisionRepository.create(
        new RevisionSchedule({
          id: 'seed-revision-normalization',
          userId: user.getId(),
          topicId: NORMALIZATION_TOPIC_ID,
          topicName: 'Database Normalization',
          memoryStrength: 88,
          easeFactor: 2.7,
          intervalDays: 12,
          reviewCount: 5,
          lastReviewedAt: addDays(today, -2),
          nextReviewAt: addDays(today, 10),
        }),
      ),
    ]);

    console.info('[seed] Demo data created successfully.');
    console.info('[seed] Login email: %s', DEMO_EMAIL);
    console.info('[seed] Login password: %s', DEMO_PASSWORD);
    console.info(
      '[seed] Seeded 2 spaces, 3 notes, 2 quizzes, 2 decks, 2 exam plans, 3 study sessions, weekly availability and a shared quiz.',
    );
    console.info('[seed] Shared quiz: /api/public/quizzes/%s', shareToken);
    console.info(
      '[seed] Demo highlights: a missed study day and an exam in 2 days under "needs attention".',
    );
  } finally {
    await Database.getInstance().disconnect();
  }
};

void seed().catch((error: unknown) => {
  console.error('[seed] Failed to seed demo data:', error);
  process.exitCode = 1;
});
