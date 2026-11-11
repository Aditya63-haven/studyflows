# Sequence Diagram: Generate a Quiz from a Note

This flow covers `POST /api/notes/:id/generate-quiz`. The AI provider is selected once in the
composition root from `AI_PROVIDER`; the service and facade depend only on `IAIProvider`.

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant API as Express API
    participant Auth as JWT middleware
    participant Ctrl as QuizController
    participant Svc as QuizService
    participant NoteRepo as NoteRepository
    participant Mongo as MongoDB
    participant Facade as StudyFacade
    participant Provider as IAIProvider
    participant Remote as External AI service
    participant Factory as QuestionFactory
    participant Quiz as Quiz
    participant QuizRepo as QuizRepository

    Student->>API: POST /api/notes/:id/generate-quiz
    API->>Auth: verify Bearer token
    alt Token missing or invalid
        Auth-->>API: AuthError
        API-->>Student: 401 Unauthorized
    else Token valid
        Auth->>Ctrl: next()
        Ctrl->>Svc: generateFromNote(userId, noteId)
        Svc->>NoteRepo: findById(noteId)
        NoteRepo->>Mongo: find note
        Mongo-->>NoteRepo: note document
        NoteRepo-->>Svc: Note

        alt Note missing
            Svc-->>Ctrl: NotFoundError
            Ctrl-->>Student: 404 note not found
        else Note not owned by user
            Svc-->>Ctrl: ForbiddenError
            Ctrl-->>Student: 403 forbidden
        else Note owned
            Svc->>Facade: generateQuizFromNote(note)
            Facade->>Provider: generateQuiz({title, content})

            alt AI_PROVIDER=mock
                Note over Provider: MockAIProvider builds deterministic questions
            else AI_PROVIDER=external
                Note over Provider: ExternalAIProvider selected in container
                Provider->>Remote: POST /generate-quiz
                Remote-->>Provider: JSON questions
            end

            Provider-->>Facade: AIGeneratedQuestion[]

            alt Provider returned no questions
                Facade-->>Svc: ValidationError
                Svc-->>Ctrl: error
                Ctrl-->>Student: 400 no questions generated
            else Questions returned
                loop For every generated question
                    Facade->>Factory: create(QuestionFactoryInput)
                    Factory-->>Facade: MCQQuestion, MultiSelectQuestion or TrueFalseQuestion
                end

                Facade->>Quiz: new Quiz({title, ownerId, spaceId, questions})
                Facade-->>Svc: Quiz
                Svc->>QuizRepo: create(quiz)
                QuizRepo->>Mongo: insert into quizzes
                Mongo-->>QuizRepo: stored quiz
                QuizRepo-->>Svc: Quiz
                Svc-->>Ctrl: Quiz
                Ctrl-->>Student: 201 Created with generated quiz
            end
        end
    end
```

## Notes

- `QuizService` validates ownership before calling the AI provider; generated content is never
  created on another user's note.
- `StudyFacade.toFactoryInput()` narrows the provider's discriminated question data and rejects
  incomplete MCQ, multi-select or true/false payloads with `ValidationError`.
- `QuestionFactory.create()` performs the polymorphic construction. `QuizService` and
  `StudyFacade` never instantiate a concrete question subtype directly.
- If the provider returns an empty array, the request fails before any quiz is persisted.
