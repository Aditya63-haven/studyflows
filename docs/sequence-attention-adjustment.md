# Sequence: Missed Session → Notification → Adjustment

Shows how a missed study session becomes a notification in the app header and how the
student applies a reschedule suggestion from the "Needs attention" card. The same flow
powers the assistant command bar (`POST /api/assistant/command` → confirm → apply).

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant C as AttentionController
    participant A as AttentionService
    participant P as ExamPlanRepository
    participant AR as AvailabilityRepository
    participant E as EventBus
    participant N as NotificationService
    participant NR as NotificationRepository

    Student->>C: GET /api/attention
    C->>A: report(userId)
    A->>P: findByOwner(userId)

    loop each plan with missed work
        A->>P: plan.getMissedWork(now)
    end

    alt missed day found
        A->>E: publish(SessionMissedEvent)
        E->>N: update(event)
        N->>NR: findByOwnerAndDedupeKey(userId, key)
        N->>NR: create(notification)
        Note over N: Header badge shows unread count
    end

    opt exam within 7 days with incomplete topics
        A->>E: publish(ExamApproachingEvent)
        E->>N: update(event)
        N->>NR: create(notification)
    end

    loop each attention item
        A->>AR: findByOwner(userId)
        A->>A: strategies.propose(RescheduleRequest)
        Note over A: MoveToNextFreeSlotStrategy and<br/>MoveToWeekendStrategy run polymorphically
    end

    A-->>C: AttentionReport(items with suggestions)
    C-->>Student: items + strategy buttons

    Student->>C: POST /api/attention/:itemId/apply {strategy}
    C->>A: apply(userId, itemId, strategy)
    A->>AR: findByOwner(userId)
    A->>A: strategy.propose(RescheduleRequest)
    A->>P: plan.moveTopics(fromDayId, targetDate, topicIds)
    Note over P: ExamPlan recomputes plannedMinutes<br/>and drops empty days
    A->>P: update(planId, plan)
    A-->>C: updated plan + AppliedChange
    C-->>Student: refreshed dashboard
```
