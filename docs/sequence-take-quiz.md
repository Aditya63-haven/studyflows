# Sequence Diagram: Take a Quiz

This flow covers `POST /api/quizzes/:id/attempts`. The public shared-quiz attempt path resolves
an active share token and calls `Quiz.grade()` directly: it returns feedback without storing an
attempt or publishing a domain event.

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant API as Express API
    participant Auth as JWT middleware
    participant Ctrl as QuizController
    participant Svc as QuizService
    participant QuizRepo as QuizRepository
    participant Mongo as MongoDB
    participant Facade as StudyFacade
    participant Quiz as Quiz
    participant Bus as EventBus
    participant Analytics as AnalyticsService
    participant Revision as RevisionService
    participant AttemptRepo as QuizAttemptRepository

    Student->>API: POST /api/quizzes/:id/attempts
    API->>Auth: verify Bearer token
    alt Token missing or invalid
        Auth-->>API: AuthError
        API-->>Student: 401 Unauthorized
    else Token valid
        Auth->>Ctrl: next()
        Ctrl->>Svc: take(userId, quizId, answers)
        Svc->>QuizRepo: findById(quizId)
        QuizRepo->>Mongo: find quiz
        Mongo-->>QuizRepo: quiz document
        QuizRepo-->>Svc: Quiz

        alt Quiz missing
            Svc-->>Ctrl: NotFoundError
            Ctrl-->>Student: 404 quiz not found
        else Quiz not owned by user
            Svc-->>Ctrl: ForbiddenError
            Ctrl-->>Student: 403 forbidden
        else Quiz owned
            Svc->>Facade: gradeAndRecordAttempt(quiz, userId, answers)
            Facade->>Quiz: grade(answers)
            Quiz->>Quiz: evaluate() on every Question
            Note over Quiz: Polymorphic dispatch across<br/>MCQQuestion, MultiSelectQuestion<br/>and TrueFalseQuestion
            Quiz-->>Facade: QuizGradeResult

            Facade->>Facade: new QuizAttempt(quizId, userId, answers, result)
            Facade->>Bus: publish(QuizCompletedEvent)
            Bus->>Analytics: update(event)
            Analytics-->>Bus: cache recent completion
            Bus->>Revision: update(event)
            Revision->>Revision: rating from percentage
            Revision->>Revision: IRevisionStrategy.calculateNextReview(...)

            alt Schedule exists for this quiz topic
                Revision->>Revision: setTopicName + applyReview + update
            else No schedule yet
                Revision->>Revision: create RevisionSchedule
            end

            Bus-->>Facade: publish resolves
            Facade-->>Svc: QuizAttempt
            Svc->>AttemptRepo: create(attempt)
            AttemptRepo->>Mongo: insert into quizattempts
            Mongo-->>AttemptRepo: stored attempt
            AttemptRepo-->>Svc: QuizAttempt
            Svc-->>Ctrl: QuizAttempt
            Ctrl-->>Student: 201 Created with score, percentage and evaluations
        end
    end
```

## Notes

- The event is published before `QuizAttemptRepository.create()` runs. Analytics caches the
  event, and `RevisionService` creates or updates the topic's revision schedule.
- `Quiz.grade()` never checks a question's concrete class. It calls the polymorphic
  `Question.evaluate()` method, so a new question subtype can be added without editing grading
  code.
- Ownership is checked before grading. The public quiz route instead resolves an active,
  non-revoked share token and calls `Quiz.grade()` directly; guests receive feedback but no
  `QuizAttempt` is persisted and no analytics/revision event is published.
