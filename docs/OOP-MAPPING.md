# OOP Requirement Map

Every row points to a real file in this repository. Paths are relative to the project root.

## Concept map

| Required concept | Where it is demonstrated | File path and class |
|---|---|---|
| Classes, objects, attributes, methods and constructors | Domain entities are constructed from validated props objects with private attributes and public behaviour. | `backend/src/domain/entities/User.ts` — `User` (constructor `User(props)` and validated methods). The full required class catalogue is below. |
| Encapsulation | `User` keeps `_passwordHash` private, has no public hash getter and omits the hash from `toJSON()`. `Flashcard` keeps scheduling fields private with validated setters. | `backend/src/domain/entities/User.ts` — `User`; `backend/src/domain/entities/Flashcard.ts` — `Flashcard` |
| Abstraction | Abstract `StudyItem` requires subclasses to implement `summary()` and `itemType`. Focused interfaces define the rest of the contracts. | `backend/src/domain/base/StudyItem.ts` — `StudyItem`; `backend/src/domain/interfaces/IAIProvider.ts` — `IAIProvider`; `backend/src/domain/interfaces/IRepository.ts` — `IRepository`; `backend/src/domain/interfaces/IShareable.ts` — `IShareable`; `backend/src/domain/interfaces/IGradable.ts` — `IGradable`; `backend/src/domain/interfaces/IRevisionStrategy.ts` — `IRevisionStrategy`; `backend/src/domain/interfaces/IObserver.ts` — `IObserver` |
| Inheritance | `Note`, `Quiz` and `FlashcardDeck` extend `StudyItem`. `MCQQuestion`, `MultiSelectQuestion` and `TrueFalseQuestion` extend `Question`. | `backend/src/domain/base/StudyItem.ts` — `StudyItem`; `backend/src/domain/entities/Note.ts` — `Note`; `backend/src/domain/entities/Quiz.ts` — `Quiz`; `backend/src/domain/entities/FlashcardDeck.ts` — `FlashcardDeck`; `backend/src/domain/questions/Question.ts` — `Question`; `backend/src/domain/questions/MCQQuestion.ts` — `MCQQuestion`; `backend/src/domain/questions/MultiSelectQuestion.ts` — `MultiSelectQuestion`; `backend/src/domain/questions/TrueFalseQuestion.ts` — `TrueFalseQuestion` |
| Polymorphism | `Question.evaluate()` is overridden per subtype; `Quiz.grade()` loops over mixed questions without type checks; `StudyItem.summary()` is overridden; strategies and AI providers are swapped at runtime. | `backend/src/domain/questions/Question.ts` — `Question`; `backend/src/domain/entities/Quiz.ts` — `Quiz`; `backend/src/domain/base/StudyItem.ts` — `StudyItem`; `backend/src/patterns/strategy/SM2Strategy.ts` — `SM2Strategy`; `backend/src/patterns/adapter/MockAIProvider.ts` — `MockAIProvider` |
| Association: `User` — `StudySpace` | A user owns zero or more study spaces through `ownerId`. | `backend/src/domain/entities/User.ts` — `User`; `backend/src/domain/entities/StudySpace.ts` — `StudySpace` |
| Association: `QuizAttempt` — `Quiz` | An attempt stores the quiz ID and the user ID that produced it. | `backend/src/domain/entities/QuizAttempt.ts` — `QuizAttempt`; `backend/src/domain/entities/Quiz.ts` — `Quiz` |
| Association: `Bookmark` — `StudyItem` | A bookmark refers to a note, quiz or deck by ID and type without owning it. | `backend/src/domain/entities/Bookmark.ts` — `Bookmark`; `backend/src/domain/base/StudyItem.ts` — `StudyItem` |
| Aggregation: `StudySpace` — notes, quizzes and decks | The space groups independently existing study items and validates that each item belongs to the space. | `backend/src/domain/entities/StudySpace.ts` — `StudySpace` |
| Aggregation: `ExamPlan` — `Topic` | The plan aggregates topic objects that can exist and be managed independently. | `backend/src/domain/entities/ExamPlan.ts` — `ExamPlan`; `backend/src/domain/entities/Topic.ts` — `Topic` |
| Composition: `Quiz` — `Question` | The quiz owns its question collection and replaces or mutates it through quiz methods. | `backend/src/domain/entities/Quiz.ts` — `Quiz`; `backend/src/domain/questions/Question.ts` — `Question` |
| Composition: `FlashcardDeck` — `Flashcard` | The deck owns its cards; cards are added, replaced and removed through the deck. | `backend/src/domain/entities/FlashcardDeck.ts` — `FlashcardDeck`; `backend/src/domain/entities/Flashcard.ts` — `Flashcard` |
| Composition: `ExamPlan` — `StudyDay` | The plan owns its generated study days and replaces them when rescheduled. | `backend/src/domain/entities/ExamPlan.ts` — `ExamPlan`; `backend/src/domain/entities/StudyDay.ts` — `StudyDay` |
| SOLID principles | One concrete example per principle, with the class and file that demonstrates it. | `docs/SOLID.md` — `QuizService`, `QuestionFactory`, `Question`, `Quiz`, `IObserver`, `RevisionService` |
| Factory pattern | `QuestionFactory` maps a discriminated question type to the correct concrete constructor and supports registering new creators. | `backend/src/patterns/factory/QuestionFactory.ts` — `QuestionFactory` |
| Strategy pattern | Two interchangeable spaced-repetition algorithms implement the same contract. | `backend/src/patterns/strategy/SimpleMemoryStrengthStrategy.ts` — `SimpleMemoryStrengthStrategy`; `backend/src/patterns/strategy/SM2Strategy.ts` — `SM2Strategy`; `backend/src/domain/interfaces/IRevisionStrategy.ts` — `IRevisionStrategy` |
| Observer pattern | `EventBus` publishes `QuizCompletedEvent`; analytics and revision subscribe without the quiz flow knowing the observers. | `backend/src/patterns/observer/EventBus.ts` — `EventBus`; `backend/src/patterns/observer/events.ts` — domain event types; `backend/src/services/AnalyticsService.ts` — `AnalyticsService`; `backend/src/services/RevisionService.ts` — `RevisionService`; `backend/src/domain/interfaces/IObserver.ts` — `IObserver` |
| Repository pattern | A generic persistence contract is implemented by a generic Mongoose base repository, then specialised by entity repositories. | `backend/src/domain/interfaces/IRepository.ts` — `IRepository`; `backend/src/repositories/BaseRepository.ts` — `BaseRepository`; `backend/src/repositories/UserRepository.ts` — `UserRepository` |
| Singleton pattern | `Config` and `Database` expose one process-wide instance through `getInstance()` and private constructors. | `backend/src/config/Config.ts` — `Config`; `backend/src/config/Database.ts` — `Database` |
| Builder pattern | `ExamPlanBuilder` builds a day-by-day `ExamPlan` through fluent setters and a final `build()`. | `backend/src/patterns/builder/ExamPlanBuilder.ts` — `ExamPlanBuilder`; `backend/src/domain/entities/ExamPlan.ts` — `ExamPlan` |
| Adapter pattern | Mock and external AI providers adapt different backends to the same `IAIProvider` contract. | `backend/src/patterns/adapter/MockAIProvider.ts` — `MockAIProvider`; `backend/src/patterns/adapter/ExternalAIProvider.ts` — `ExternalAIProvider`; `backend/src/domain/interfaces/IAIProvider.ts` — `IAIProvider` |
| Facade pattern | `StudyFacade` hides coordination between AI providers, question generation, grading, strategies, events and the exam-plan builder. | `backend/src/patterns/facade/StudyFacade.ts` — `StudyFacade` |
| Exception handling hierarchy | All expected API errors extend `AppError`, which carries status code, operational flag and safe JSON serialisation. | `backend/src/errors/AppError.ts` — `AppError`; `backend/src/errors/ValidationError.ts` — `ValidationError`; `backend/src/errors/NotFoundError.ts` — `NotFoundError`; `backend/src/errors/AuthError.ts` — `AuthError`; `backend/src/errors/ForbiddenError.ts` — `ForbiddenError`; `backend/src/errors/ConflictError.ts` — `ConflictError` |
| Central error handling and input validation | One Express middleware converts `AppError` and unknown errors into a consistent JSON shape. Zod schemas validate every route input. | `backend/src/middleware/errorMiddleware.ts` — `errorMiddleware`; `backend/src/validation/validate.ts` — `validate`; `backend/src/validation/schemas.ts` — route schemas |
| Maintainability and modularity | Application layers are separated into `domain`, `services`, `repositories`, `controllers`, `routes`, `patterns`, `errors`, `config` and `middleware`, with one composition root. | `backend/src/app.ts` — `createApp`; `backend/src/routes/index.ts` — `createApiRouter`; `backend/src/container.ts` — `createContainer` and `AppContainer` |

## Required domain class catalogue

| Required class | File path | Role |
|---|---|---|
| `User` | `backend/src/domain/entities/User.ts` | Registered student and owner of study data |
| `StudySpace` | `backend/src/domain/entities/StudySpace.ts` | Subject workspace that aggregates study items |
| `Note` | `backend/src/domain/entities/Note.ts` | Markdown note study item |
| `Quiz` | `backend/src/domain/entities/Quiz.ts` | Gradable study item that owns questions |
| `Question` | `backend/src/domain/questions/Question.ts` | Abstract question base with polymorphic evaluation |
| `QuizAttempt` | `backend/src/domain/entities/QuizAttempt.ts` | Stored, graded attempt linked to a quiz and user |
| `Flashcard` | `backend/src/domain/entities/Flashcard.ts` | Card with private spaced-repetition state |
| `FlashcardDeck` | `backend/src/domain/entities/FlashcardDeck.ts` | Study item that owns its flashcards |
| `Topic` | `backend/src/domain/entities/Topic.ts` | Topic aggregated by exam plans and referenced by revision |
| `RevisionSchedule` | `backend/src/domain/entities/RevisionSchedule.ts` | Per-topic spaced-repetition state |
| `ExamPlan` | `backend/src/domain/entities/ExamPlan.ts` | Aggregates topics and owns generated study days |
| `StudyDay` | `backend/src/domain/entities/StudyDay.ts` | One generated day inside an exam plan |
| `StudySession` | `backend/src/domain/entities/StudySession.ts` | Recorded study time used by analytics |
| `SharedLink` | `backend/src/domain/entities/SharedLink.ts` | Public read-only link for a note or quiz |
| `Bookmark` | `backend/src/domain/entities/Bookmark.ts` | Saved reference from a user to a study item |

Additional inheritance classes used by the required `Question` and `StudyItem` bases:

| Class | File path | Role |
|---|---|---|
| `StudyItem` | `backend/src/domain/base/StudyItem.ts` | Abstract base for notes, quizzes and flashcard decks |
| `MCQQuestion` | `backend/src/domain/questions/MCQQuestion.ts` | Single-answer multiple-choice question |
| `MultiSelectQuestion` | `backend/src/domain/questions/MultiSelectQuestion.ts` | Multiple-answer question |
| `TrueFalseQuestion` | `backend/src/domain/questions/TrueFalseQuestion.ts` | True/false question |
