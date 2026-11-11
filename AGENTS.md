# AGENTS.md — StudyFlows

StudyFlows is a full-stack "AI-style" study assistant built as a university Object-Oriented
Programming course project. The primary goal is to **demonstrate OOP concepts clearly** so that
graders can point to each concept in the source code. Features are inspired by
studyassistant.in but intentionally simplified.

Everything in this file is binding context for every session. Read it before making changes.

---

## Tech stack

### Backend
- Node.js + Express + TypeScript (real abstract classes, interfaces, private/protected members)
- Mongoose + MongoDB
- JWT authentication, bcrypt password hashing
- Jest (unit + API integration tests)
- ESLint + Prettier
- Central error middleware, route input validation
- Config via `.env` (provide `.env.example`); MongoDB URI comes from env

### Frontend
- React + Vite + TypeScript
- React Router
- Axios
- Simple, clean UI (no heavy UI framework required)

### Layout
- `/backend`
- `/frontend`
- `/docs`
- root `README.md`

---

## Features (small but working end to end)

1. **Auth** — register/login, hashed passwords, JWT.
2. **Study Spaces** — one workspace per subject holding notes, quizzes and flashcard decks.
3. **Notes** — markdown notes with create/edit/delete and "condense to summary" (via AI service).
4. **Quizzes** — MCQ, multi-select and true/false questions; take quiz, auto-grade, feedback,
   stored attempts; generate a quiz from a note (via AI service).
5. **Flashcards** — decks, flip/shuffle, rate each card (Again/Hard/Good/Easy).
6. **Revision mode (spaced repetition)** — memory-strength score per topic, next review date,
   dashboard with "due today", "needs revision", "mastered".
7. **Exam Plan** — exam name, date, subjects, daily study hours → day-by-day topic plan; mark
   topics complete; progress %.
8. **Analytics** — study time, streaks, quiz score trend, per-subject breakdown, weak topics.
9. **Sharing** — public read-only link for a quiz or note; shared quizzes can be attempted
   without login.
10. **Bookmarks and global search** across notes, quizzes and flashcards.

All AI features go through an `IAIProvider` interface. Ship a **MockAIProvider** (deterministic,
no API key needed) and an optional external provider stub selected by env var.

---

## Required OOP concepts

Mark each concept in code with a comment like `// OOP: Polymorphism`.

1. **Classes, objects, attributes, methods, constructors**:
   `User`, `StudySpace`, `Note`, `Quiz`, `Question`, `QuizAttempt`, `Flashcard`,
   `FlashcardDeck`, `Topic`, `RevisionSchedule`, `ExamPlan`, `StudyDay`,
   `StudySession`, `SharedLink`, `Bookmark`.
2. **Encapsulation** — private fields with validated getters/setters (e.g. `User.passwordHash`
   never exposed; `Quiz` questions list; `Flashcard` ease factor).
3. **Abstraction** — abstract class `StudyItem` (id, title, owner, createdAt, abstract
   `summary()`); interfaces `IAIProvider`, `IRepository<T>`, `IShareable`, `IGradable`,
   `IRevisionStrategy`, `IObserver`.
4. **Inheritance** — `StudyItem` → `Note`, `Quiz`, `FlashcardDeck`; abstract `Question` →
   `MCQQuestion`, `MultiSelectQuestion`, `TrueFalseQuestion`.
5. **Polymorphism** — `Question.evaluate(answer)` overridden per subtype; `Quiz.grade()` works
   over mixed question types with no type checks; `StudyItem.summary()` overridden; runtime
   swapping of `IRevisionStrategy` and `IAIProvider` implementations.
6. **Relationships** (label in code and in the class diagram):
   - **Association**: `User`–`StudySpace`, `QuizAttempt`–`Quiz`, `Bookmark`–`StudyItem`.
   - **Aggregation**: `StudySpace` aggregates Notes/Quizzes/Decks; `ExamPlan` aggregates Topics.
   - **Composition**: `Quiz` owns Questions; `FlashcardDeck` owns Flashcards; `ExamPlan` owns
     StudyDays.
7. **SOLID** — `/docs/SOLID.md` gives one concrete example per principle and the file it lives in:
   - SRP (controller/service/repository split)
   - OCP (new Question type or AI provider without editing existing code)
   - LSP (any Question subtype is substitutable)
   - ISP (small interfaces)
   - DIP (services depend on abstractions injected through constructors)
8. **Design patterns**, each in its own clearly named file:
   - **Factory** — `QuestionFactory`
   - **Strategy** — `SimpleMemoryStrengthStrategy` and `SM2Strategy`
   - **Observer** — `EventBus`: `QuizCompleted` notifies `AnalyticsService` and `RevisionService`
   - **Repository** — generic `BaseRepository<T>` plus Mongoose implementations
   - **Singleton** — Database connection manager, `Config`
   - **Builder** — `ExamPlanBuilder`
   - **Adapter** — AI providers
   - **Facade** — `StudyFacade` for controllers
9. **Exception handling and maintainability** — custom hierarchy `AppError` → `ValidationError`,
   `NotFoundError`, `AuthError`, `ForbiddenError`, `ConflictError`; central Express error
   middleware returning a consistent JSON shape; validate every route input; never swallow
   errors. Modular folders: `domain`, `services`, `repositories`, `controllers`, `routes`,
   `middleware`, `patterns`, `errors`, `config`. ESLint + Prettier, TSDoc on public classes.

---

## UML diagrams (in `/docs`, written in Mermaid)

- `use-case.md` (actors: Student, Guest viewer of a shared link)
- `class-diagram.md` (visibility, inheritance, association/aggregation/composition,
  multiplicities)
- `sequence-take-quiz.md` and `sequence-generate-quiz-from-note.md`
- `activity-exam-plan.md` and `activity-revision.md`
- `OOP-MAPPING.md` — a table mapping each required concept → file path + class name

---

## Database (MongoDB)

Canonical collection names (use exactly these, no aliases):

| Purpose | Collection |
|---|---|
| Users | `users` |
| Study spaces | `studyspaces` |
| Notes | `notes` |
| Quizzes (questions embedded) | `quizzes` |
| Flashcard decks (cards embedded) | `flashcarddecks` |
| Quiz attempts | `quizattempts` |
| Revision schedules | `revisionschedules` |
| Exam plans | `examplans` |
| Study sessions | `sessions` |
| Shared links | `sharedlinks` |
| Bookmarks | `bookmarks` |

Add indexes:
- `owner` on user-owned collections (`studyspaces`, `notes`, `quizzes`, `flashcarddecks`,
  `quizattempts`, `examplans`, `sessions`, `bookmarks`)
- `space` on space-scoped collections (`notes`, `quizzes`, `flashcarddecks`)
- `nextReviewAt` on `revisionschedules`
- `shareToken` on `sharedlinks` (unique)

Provide a seed script with demo data: 1 user, 2 spaces, sample notes, quizzes and decks.

---

## Testing

Jest unit tests for:
- each Question subtype's `evaluate()`
- `QuestionFactory`
- both revision strategies
- `ExamPlanBuilder`
- error classes
- the Observer flow

Plus one API integration test for taking a quiz.

---

## Working rules

- Build in phases and **STOP after each one** so the user can review:
  - (a) backend skeleton, errors, config, DB singleton
  - (b) domain classes and patterns
  - (c) repositories, services, controllers, routes
  - (d) frontend
  - (e) tests and seed
  - (f) docs, UML and README
- After each phase, run the build and tests and fix errors before stopping.
- No placeholder TODOs for core features. Prefer simple, readable and correct over
  over-engineered.
- README must include setup (install, env, running MongoDB, seed, start backend and frontend),
  an API endpoint list and a project overview.
