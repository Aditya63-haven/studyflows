# SOLID Principles in StudyFlows

Each principle below points to a concrete class or function in the repository.

## SRP — Single Responsibility Principle

**Example:** `QuizService` in `backend/src/services/QuizService.ts`.

`QuizService` owns quiz use cases only: authoring, ownership checks, taking an attempt and
starting note-based generation. It does not handle HTTP responses, Mongoose documents or
question construction:

- HTTP concerns live in `QuizController` in `backend/src/controllers/QuizController.ts`.
- Persistence lives in `QuizRepository` in `backend/src/repositories/QuizRepository.ts`.
- Grading and event publication live in `StudyFacade` in
  `backend/src/patterns/facade/StudyFacade.ts`.
- Question construction lives in `QuestionFactory` in
  `backend/src/patterns/factory/QuestionFactory.ts`.

The controller/service/repository split keeps each class focused and testable.

## OCP — Open/Closed Principle

**Example:** `QuestionFactory` in `backend/src/patterns/factory/QuestionFactory.ts`.

`QuestionFactory` keeps a creator registry and exposes `register(type, creator)`. A new question
type can be added by registering a creator, without changing the call sites that use
`QuestionFactory.create()` in `QuizService` or `StudyFacade`.

The same extension point appears in the AI layer: `IAIProvider` in
`backend/src/domain/interfaces/IAIProvider.ts` allows a new provider adapter to be added without
editing `NoteService` or `StudyFacade`.

## LSP — Liskov Substitution Principle

**Example:** `Question` in `backend/src/domain/questions/Question.ts`, used by `Quiz` in
`backend/src/domain/entities/Quiz.ts`.

`Quiz.grade()` operates on `Question[]` and calls `evaluate()` and `getPoints()` only. Every
subtype — `MCQQuestion`, `MultiSelectQuestion` and `TrueFalseQuestion` — can replace another
wherever a `Question` is expected without changing the behaviour of the grading loop or
introducing type checks.

## ISP — Interface Segregation Principle

**Example:** `IObserver<T>` in `backend/src/domain/interfaces/IObserver.ts`.

The observer contract exposes only `update(event)`. `AnalyticsService` and `RevisionService`
implement just that method and are not forced to depend on unrelated service methods. The same
approach is used by `IGradable`, `IShareable` and `IAIProvider`; each interface describes one
capability.

## DIP — Dependency Inversion Principle

**Example:** `RevisionService` in `backend/src/services/RevisionService.ts`.

`RevisionService` depends on the `IRevisionStrategy` abstraction injected through its
constructor, not on `SM2Strategy` or `SimpleMemoryStrengthStrategy` directly. The composition
root in `backend/src/container.ts` selects the concrete strategy from configuration and injects
it. `NoteService` and `QuizService` follow the same pattern with repositories and `StudyFacade`.
