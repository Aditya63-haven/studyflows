# Activity Diagram: Exam Plan

## Create an exam plan

`POST /api/exam-plans` validates the request with Zod, then `ExamPlanService` uses
`ExamPlanBuilder` to distribute topics across calendar days up to the exam date. A single topic
may exceed the daily capacity; the builder keeps at least one topic per day and appends any
overflow to the final study day.

```mermaid
flowchart TD
    Start(["Student submits an exam plan"]) --> TopicCheck{"At least one topic?"}
    TopicCheck -- "No" --> TopicError["ValidationError -> 400"]
    TopicCheck -- "Yes" --> Builder["ExamPlanBuilder<br/>set owner, name, exam date, daily hours"]
    Builder --> AddTopics["Create Topic objects<br/>and add them to the builder"]
    AddTopics --> Build["build(now)"]
    Build --> Required{"Name, owner and exam date present?"}
    Required -- "No" --> BuildError["ValidationError -> 400"]
    Required -- "Yes" --> Past{"Exam date before today?"}
    Past -- "Yes" --> BuildError
    Past -- "No" --> Capacity["capacityMinutes = dailyStudyHours x 60"]
    Capacity --> Remaining{"Topics remaining and<br/>currentDate <= examDate?"}
    Remaining -- "Yes" --> Fill["Create StudyDay<br/>add topics while capacity allows"]
    Fill --> Next["currentDate = currentDate + 1 day"]
    Next --> Remaining
    Remaining -- "No" --> Overflow{"Topics still remaining?"}
    Overflow -- "Yes" --> Append["Append remaining topics<br/>to the last StudyDay"]
    Overflow -- "No" --> Persist["ExamPlanRepository.create(plan)"]
    Append --> Persist
    Persist --> Done(["201 Created with ExamPlan"])
    TopicError --> ErrorResponse(["Central error middleware returns JSON error"])
    BuildError --> ErrorResponse
```

## Mark a topic complete

`POST /api/exam-plans/:id/topics/:topicId/complete` can receive an optional `dayId`. When it is
omitted, the plan marks the topic on the first study day that contains it.

```mermaid
flowchart TD
    Start(["Student marks a topic complete"]) --> Load["ExamPlanService.getOwned"]
    Load --> Found{"Plan exists?"}
    Found -- "No" --> NotFound["NotFoundError -> 404"]
    Found -- "Yes" --> Owner{"Owner matches?"}
    Owner -- "No" --> Forbidden["ForbiddenError -> 403"]
    Owner -- "Yes" --> Topic{"Topic belongs to plan?"}
    Topic -- "No" --> Topic404["NotFoundError -> 404"]
    Topic -- "Yes" --> Day{"dayId supplied?"}
    Day -- "Yes" --> FindDay["Find that StudyDay"]
    Day -- "No" --> FirstDay["Find first StudyDay containing topic"]
    FindDay --> Mark["plan.markTopicComplete(topicId, dayId)"]
    FirstDay --> Mark
    Mark --> Save["ExamPlanRepository.update"]
    Save --> Saved{"Update returned a plan?"}
    Saved -- "No" --> NotFound
    Saved -- "Yes" --> Progress["Compute progress from completed / planned topics"]
    Progress --> Finish(["200 OK with updated ExamPlan"])
```

## Notes

- If the requested `dayId` does not contain the topic, `markTopicComplete()` returns `false`
  and the plan is saved unchanged.
- `ExamPlan.getProgress()` uses the distinct planned topic IDs, falling back to the plan's topic
  list when no study days exist, so completion percentage stays stable across reschedules.
- When an exam date or daily study hours change, `ExamPlanService.update()` rebuilds the study
  days and then restores previously completed topics.
