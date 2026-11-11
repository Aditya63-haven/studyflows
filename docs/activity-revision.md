# Activity Diagram: Revision Mode

## Load the revision dashboard

`GET /api/revision/dashboard` groups every schedule for the current user by
`RevisionSchedule.getStatus()`. Due status wins over memory strength, then weak and mastered
topics are separated by score.

```mermaid
flowchart TD
    Start(["Student opens revision dashboard"]) --> Load["RevisionService.dashboard(userId, now)"]
    Load --> Fetch["RevisionScheduleRepository.findByUser(userId)"]
    Fetch --> Each["For each RevisionSchedule<br/>call getStatus(now)"]
    Each --> Due{"nextReviewAt <= end of today?"}
    Due -- "Yes" --> DueGroup["dueToday"]
    Due -- "No" --> Weak{"memoryStrength < 40?"}
    Weak -- "Yes" --> WeakGroup["needsRevision"]
    Weak -- "No" --> Mastered{"memoryStrength >= 80?"}
    Mastered -- "Yes" --> MasteredGroup["mastered"]
    Mastered -- "No" --> ScheduledGroup["scheduled"]
    DueGroup --> Counts["Return groups + counts"]
    WeakGroup --> Counts
    MasteredGroup --> Counts
    ScheduledGroup --> Counts
    Counts --> Done(["200 OK dashboard"])
```

## Review a due topic

`POST /api/revision/:id/review` accepts `again`, `hard`, `good` or `easy`. The service applies
the configured `IRevisionStrategy`, then persists the updated schedule.

```mermaid
flowchart TD
    Start(["Student submits a revision rating"]) --> Validate{"Rating is again, hard, good or easy?"}
    Validate -- "No" --> Bad["ValidationError -> 400"]
    Validate -- "Yes" --> Find["RevisionScheduleRepository.findById"]
    Find --> Exists{"Schedule exists?"}
    Exists -- "No" --> NotFound["NotFoundError -> 404"]
    Exists -- "Yes" --> Owner{"Schedule belongs to user?"}
    Owner -- "No" --> Forbidden["ForbiddenError -> 403"]
    Owner -- "Yes" --> State["schedule.toReviewState()"]
    State --> Calc["IRevisionStrategy.calculateNextReview(state, rating, now)"]
    Calc --> Apply["schedule.applyReview(result)"]
    Apply --> Update["RevisionScheduleRepository.update"]
    Update --> Updated{"Updated?"}
    Updated -- "No" --> NotFound
    Updated -- "Yes" --> Finish(["200 OK with updated schedule"])
```

## Review a flashcard

Flashcards use the same strategy abstraction but keep their scheduling state inside the owned
`Flashcard` object.

```mermaid
flowchart TD
    Start(["Student reviews a flashcard"]) --> Load["FlashcardService.getOwned(ownerId, deckId)"]
    Load --> DeckFound{"Deck exists and is owned?"}
    DeckFound -- "No" --> DeckError["NotFoundError / ForbiddenError"]
    DeckFound -- "Yes" --> CardFound{"Card exists in deck?"}
    CardFound -- "No" --> CardError["NotFoundError -> 404"]
    CardFound -- "Yes" --> State["Build ReviewState<br/>memoryStrength = min(100, reviewCount x 20)"]
    State --> Calc["IRevisionStrategy.calculateNextReview(state, rating, now)"]
    Calc --> Apply["card.applySchedule(easeFactor, intervalDays, nextReviewAt, reviewedAt)"]
    Apply --> Save["FlashcardDeckRepository.update(deckId, deck)"]
    Save --> Saved{"Updated?"}
    Saved -- "No" --> DeckError
    Saved -- "Yes" --> Finish(["200 OK with updated deck"])
```

## Notes

- `RevisionService` also reacts to `QuizCompletedEvent`: it maps quiz percentage to a rating,
  calculates the next review, and creates or updates the topic schedule automatically.
- The dashboard returns four groups plus counts: `dueToday`, `needsRevision`, `mastered` and
  `scheduled`.
- Topic schedules and flashcards share the configured strategy (`SM2Strategy` by default, or
  `SimpleMemoryStrengthStrategy` when `REVISION_STRATEGY=simple`).
