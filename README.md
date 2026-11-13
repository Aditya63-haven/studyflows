# StudyFlows

StudyFlows is a full-stack study assistant built for an Object-Oriented Programming course project. Students organise subjects into study spaces, write notes, build and take quizzes, review flashcards, schedule revision, create an exam plan and track their progress.

The project deliberately uses classes, inheritance, interfaces, design patterns and a layered backend so the required OOP concepts can be found directly in the source code.

## Features

- JWT authentication with hashed passwords.
- Study spaces for each subject, grouping notes, quizzes and flashcard decks.
- Markdown notes with AI-assisted condensing and quiz generation.
- Quizzes with MCQ, multi-select and true/false questions, automatic grading and stored attempts.
- Flashcard decks with flip, shuffle and Again/Hard/Good/Easy review ratings.
- Spaced-repetition scheduling with due-today, needs-revision and mastered views.
- Exam plans generated day by day from exam date, subjects, study hours and topics.
- Analytics for study time, streaks, quiz trends, weak topics and subject breakdowns.
- Public read-only sharing for notes and quizzes, including guest quiz attempts.
- Bookmarks and global search across notes, quizzes and flashcard decks.
- Deterministic mock AI provider, so no external API key is required.

## Tech Stack

### Backend

- Node.js, Express and TypeScript
- MongoDB and Mongoose
- JWT and bcrypt
- Zod request validation
- Jest, ts-jest, Supertest and mongodb-memory-server
- ESLint and Prettier

### Frontend

- React, Vite and TypeScript
- React Router
- Axios
- React Markdown

## Project Structure

```text
Studyflows/
├── backend/
│   ├── src/
│   │   ├── config/        Config and database singletons
│   │   ├── controllers/   HTTP adapters
│   │   ├── domain/        Entities, questions, interfaces and base classes
│   │   ├── errors/        AppError hierarchy
│   │   ├── middleware/    Authentication, validation and error middleware
│   │   ├── patterns/      Factory, strategy, observer, builder, adapter and facade
│   │   ├── persistence/   Mongoose schemas and mappers
│   │   ├── repositories/  Repository implementations
│   │   ├── routes/        Express route definitions
│   │   ├── services/      Application use cases
│   │   ├── app.ts         Express app factory
│   │   ├── container.ts   Dependency composition root
│   │   ├── seed.ts        Demo data seed script
│   │   └── server.ts      HTTP server bootstrap
│   └── tests/             Jest unit and API integration tests
├── frontend/
│   └── src/               React pages, components, API clients and auth context
├── docs/                  Mermaid UML diagrams, SOLID examples and OOP map
├── AGENTS.md
└── README.md
```

## Documentation

- [Use case diagram](docs/use-case.md)
- [Class diagram](docs/class-diagram.md)
- [Sequence: take a quiz](docs/sequence-take-quiz.md)
- [Sequence: generate a quiz from a note](docs/sequence-generate-quiz-from-note.md)
- [Sequence: missed session to adjustment](docs/sequence-attention-adjustment.md)
- [Activity: exam plan](docs/activity-exam-plan.md)
- [Activity: revision mode](docs/activity-revision.md)
- [SOLID principles with code examples](docs/SOLID.md)
- [OOP requirement map](docs/OOP-MAPPING.md)

## Prerequisites

- Node.js 18 or newer
- npm
- MongoDB running locally, or a MongoDB connection string

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and set at least:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/studyflows
JWT_SECRET=replace-with-a-long-random-secret
AVATAR_STORAGE_DIR=storage/avatars
```

Start MongoDB locally, or point `MONGODB_URI` at a hosted database.

Profile pictures are written to `AVATAR_STORAGE_DIR` (resolved from the backend working directory) and served back through opaque URLs. The directory must be writable by the API and kept on persistent storage. A single local disk is not suitable for multiple backend instances unless the directory is a shared volume; for horizontal deployments, replace `LocalAvatarStorage` with an object-storage implementation of `IAvatarStorage`.

Start the API:

```bash
npm run dev
```

The backend runs at `http://localhost:4000` by default. Check it with:

```bash
curl http://localhost:4000/api/health
```

### 2. Seed demo data

With MongoDB running and the backend `.env` configured:

```bash
cd backend
npm run seed
```

The seed script is safe to run repeatedly. It removes the previous demo account and its data before inserting fresh demo content.

Demo login:

```text
Email: demo@studyflows.dev
Password: studyflows123
```

The seed creates two study spaces, three notes, two mixed-format quizzes, two flashcard decks, two quiz attempts, three revision schedules, three study sessions and one exam plan.

### 3. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies `/api` requests to `http://localhost:4000`.

To use a different API URL, copy `frontend/.env.example` to `frontend/.env` and set:

```dotenv
VITE_API_BASE_URL=/api
```

## Testing

```bash
cd backend
npm test
```

The Jest suite includes:

- Unit tests for every question subtype, mixed quiz grading, the question factory, both revision strategies, the exam-plan builder, error classes, the observer flow and singleton configuration.
- An API integration test that registers and logs in a user, creates a study space and quiz, submits an attempt and verifies the score.
- `mongodb-memory-server` provides an isolated database for the integration test, so no local test database is required.

Other backend checks:

```bash
npm run build
npm run lint
npm run format:check
```

Frontend checks:

```bash
cd frontend
npm test
npm run build
```

## API Endpoints

All endpoints are prefixed with `/api`. Except for health, registration, login, avatar images and public share endpoints, requests require:

```http
Authorization: Bearer <token>
```

### Health and authentication

| Method | Endpoint         | Description              |
| ------ | ---------------- | ------------------------ |
| GET    | `/health`        | Liveness check           |
| POST   | `/auth/register` | Register a user          |
| POST   | `/auth/login`    | Log in and receive a JWT |
| GET    | `/auth/me`       | Get the current user     |
| PATCH  | `/auth/me`       | Update current user name |
| POST   | `/auth/me/avatar` | Upload or replace the current user's profile picture (multipart field `avatar`, JPEG/PNG/WebP, max 5 MB) |
| DELETE | `/auth/me/avatar` | Remove the current user's profile picture |
| GET    | `/avatars/:key`   | Publicly read a profile picture by opaque storage key |

### Study spaces and space-scoped items

| Method | Endpoint                   | Description              |
| ------ | -------------------------- | ------------------------ |
| GET    | `/spaces`                  | List owned study spaces  |
| POST   | `/spaces`                  | Create a study space     |
| GET    | `/spaces/:id`              | Get a study space        |
| PATCH  | `/spaces/:id`              | Update a study space     |
| DELETE | `/spaces/:id`              | Delete a study space     |
| GET    | `/spaces/:spaceId/notes`   | List notes in a space    |
| POST   | `/spaces/:spaceId/notes`   | Create a note in a space |
| GET    | `/spaces/:spaceId/quizzes` | List quizzes in a space  |
| POST   | `/spaces/:spaceId/quizzes` | Create a quiz in a space |
| GET    | `/spaces/:spaceId/decks`   | List decks in a space    |
| POST   | `/spaces/:spaceId/decks`   | Create a deck in a space |

### Notes

| Method | Endpoint                   | Description                 |
| ------ | -------------------------- | --------------------------- |
| GET    | `/notes/:id`               | Get a note                  |
| PATCH  | `/notes/:id`               | Update a note               |
| DELETE | `/notes/:id`               | Delete a note               |
| POST   | `/notes/:id/condense`      | Generate an AI summary      |
| POST   | `/notes/:id/generate-quiz` | Generate a quiz from a note |

### Quizzes and attempts

| Method | Endpoint                | Description                 |
| ------ | ----------------------- | --------------------------- |
| GET    | `/quizzes/:id`          | Get a quiz                  |
| PATCH  | `/quizzes/:id`          | Update a quiz               |
| DELETE | `/quizzes/:id`          | Delete a quiz               |
| POST   | `/quizzes/:id/attempts` | Submit and grade an attempt |
| GET    | `/quizzes/:id/attempts` | List attempts for a quiz    |

### Flashcards and revision

| Method | Endpoint                          | Description                             |
| ------ | --------------------------------- | --------------------------------------- |
| GET    | `/decks/:id`                      | Get a flashcard deck                    |
| PATCH  | `/decks/:id`                      | Update a deck                           |
| DELETE | `/decks/:id`                      | Delete a deck                           |
| POST   | `/decks/:id/cards/:cardId/review` | Review a flashcard                      |
| GET    | `/revision`                       | List revision schedules                 |
| GET    | `/revision/dashboard`             | Due, needs-revision and mastered groups |
| POST   | `/revision/:id/review`            | Apply a revision rating                 |

### Exam plans, analytics and sessions

| Method | Endpoint                                   | Description                |
| ------ | ------------------------------------------ | -------------------------- |
| GET    | `/exam-plans`                              | List exam plans            |
| POST   | `/exam-plans`                              | Create an exam plan        |
| GET    | `/exam-plans/:id`                          | Get an exam plan           |
| PATCH  | `/exam-plans/:id`                          | Update an exam plan        |
| DELETE | `/exam-plans/:id`                          | Delete an exam plan        |
| POST   | `/exam-plans/:id/topics/:topicId/complete` | Mark a topic complete      |
| GET    | `/analytics`                               | Get the analytics overview |
| GET    | `/sessions`                                | List study sessions        |
| POST   | `/sessions`                                | Record a study session     |

### Availability, notifications, attention and assistant

| Method | Endpoint                       | Description                                        |
| ------ | ------------------------------ | -------------------------------------------------- |
| GET    | `/availability`                | Get the weekly study availability                  |
| PUT    | `/availability`                | Save the whole week (one day per weekday)          |
| PUT    | `/availability/:weekday`       | Save one weekday (0 = Monday ... 6 = Sunday)       |
| GET    | `/notifications`                | List notifications with the unread count          |
| PATCH  | `/notifications/:id/read`      | Mark a notification as read                       |
| GET    | `/attention`                   | Missed sessions and approaching exams with fixes  |
| POST   | `/attention/:itemId/apply`     | Apply a reschedule suggestion (`next-free-slot` or `weekend`) |
| POST   | `/assistant/command`           | Interpret a natural-language planning command     |
| POST   | `/assistant/apply`             | Confirm and apply a proposed move of study work    |

### Bookmarks, search and sharing

| Method | Endpoint                          | Description                         |
| ------ | --------------------------------- | ----------------------------------- |
| GET    | `/bookmarks`                      | List bookmarks                      |
| POST   | `/bookmarks`                      | Bookmark a note, quiz or deck       |
| DELETE | `/bookmarks/:id`                  | Remove a bookmark                   |
| GET    | `/search?q=term`                  | Search notes, quizzes and decks     |
| POST   | `/share/notes/:id`                | Create a public note link           |
| POST   | `/share/quizzes/:id`              | Create a public quiz link           |
| DELETE | `/share/:token`                   | Revoke a share link                 |
| GET    | `/public/notes/:token`            | Read a shared note without login    |
| GET    | `/public/quizzes/:token`          | Read a shared quiz without login    |
| POST   | `/public/quizzes/:token/attempts` | Attempt a shared quiz without login |

## Architecture and OOP

The backend is split into domain, persistence, repository, service, controller and route layers. Controllers depend on services, services depend on repository abstractions, and the composition root in `backend/src/container.ts` wires concrete implementations together.

Key OOP examples include:

- `StudyItem` as an abstract base for notes, quizzes and flashcard decks.
- `Question` as an abstract base for MCQ, multi-select and true/false questions, each overriding `evaluate()`.
- `IGradable`, `IAIProvider`, `IRepository`, `IRevisionStrategy`, `IRescheduleStrategy`, `IShareable` and `IObserver` as focused interfaces.
- Private fields and validated getters/setters for encapsulation.
- Association, aggregation and composition relationships between users, spaces, items, questions, decks, exam plans and weekly availability.
- `QuestionFactory`, `SimpleMemoryStrengthStrategy`, `SM2Strategy`, `MoveToNextFreeSlotStrategy`, `MoveToWeekendStrategy`, `EventBus`, repositories, `Config`, `Database`, `ExamPlanBuilder`, AI adapters and `StudyFacade` as design-pattern examples.
- An `AppError` hierarchy with central Express error middleware and consistent JSON errors.
