# Use Case Diagram

The two actors are the authenticated **Student** and the **Guest viewer** who opens a public
share link. All authenticated study features sit inside the StudyFlows system boundary. Guest
access is deliberately limited to reading a shared item and attempting a shared quiz.

```mermaid
flowchart LR
    Student(("Student"))
    Guest(("Guest viewer"))

    subgraph StudyFlows["StudyFlows system"]
        direction TB
        Auth(["Register or log in"])
        Spaces(["Manage study spaces"])
        Notes(["Create and edit notes"])
        Condense(["Condense note with AI"])
        Quizzes(["Create and manage quizzes"])
        TakeQuiz(["Take a quiz"])
        AutoGrade(["Auto-grade attempt"])
        GenerateQuiz(["Generate quiz from note"])
        Decks(["Manage flashcard decks"])
        ReviewCards(["Review flashcards"])
        Revision(["Use revision dashboard"])
        ReviewTopic(["Review a due topic"])
        ExamPlan(["Create and track exam plan"])
        Analytics(["View analytics"])
        Share(["Create public share link"])
        ViewShared(["View shared note or quiz"])
        AttemptShared(["Attempt shared quiz"])
        Bookmarks(["Bookmark study items"])
        Search(["Search study content"])
        Sessions(["Record study session"])
    end

    Student --- Auth
    Student --- Spaces
    Student --- Notes
    Student --- Condense
    Student --- Quizzes
    Student --- TakeQuiz
    Student --- GenerateQuiz
    Student --- Decks
    Student --- ReviewCards
    Student --- Revision
    Student --- ReviewTopic
    Student --- ExamPlan
    Student --- Analytics
    Student --- Share
    Student --- Bookmarks
    Student --- Search
    Student --- Sessions

    Guest --- ViewShared
    Guest --- AttemptShared

    TakeQuiz -.->|include| AutoGrade
    AttemptShared -.->|include| AutoGrade
    Condense -.->|extend| Notes
    GenerateQuiz -.->|extend| Notes
    ReviewTopic -.->|extend| Revision
```

## Notes

- **Include** relationships show behaviour that always happens as part of the base use case.
  Taking either an owned quiz or a shared quiz always runs the same grading workflow.
- **Extend** relationships show optional, AI-assisted or drill-down behaviour attached to a
  primary use case.
- `Condense` and `GenerateQuiz` use the configured `IAIProvider`, but the actor sees a single
  study action; provider selection is an internal implementation detail.
- The public share routes are the only study routes that do not require a JWT.
