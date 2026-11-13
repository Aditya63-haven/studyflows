import { MCQQuestion } from '../domain/questions/MCQQuestion';
import { MultiSelectQuestion } from '../domain/questions/MultiSelectQuestion';
import { Question } from '../domain/questions/Question';
import { TrueFalseQuestion } from '../domain/questions/TrueFalseQuestion';
import { Bookmark } from '../domain/entities/Bookmark';
import { ExamPlan } from '../domain/entities/ExamPlan';
import { FlashcardDeck } from '../domain/entities/FlashcardDeck';
import { Note } from '../domain/entities/Note';
import { Notification } from '../domain/entities/Notification';
import { Quiz } from '../domain/entities/Quiz';
import { QuizAttempt } from '../domain/entities/QuizAttempt';
import { RevisionSchedule } from '../domain/entities/RevisionSchedule';
import { SharedLink } from '../domain/entities/SharedLink';
import { StudentAvailability } from '../domain/entities/StudentAvailability';
import { StudySession } from '../domain/entities/StudySession';
import { StudySpace } from '../domain/entities/StudySpace';
import { User } from '../domain/entities/User';
import { minutesToTimeString } from '../domain/base/helpers';
import {
  AppliedChange,
  AttentionItem,
  AttentionReport,
  AttentionSuggestionView,
} from '../services/AttentionService';
import { AssistantProposal } from '../services/AssistantService';

/**
 * Converts domain objects into safe, explicit API representations.
 *
 * OOP: Encapsulation - private domain fields are never serialized directly.
 */
export class Serializer {
  public static user(user: User) {
    const avatarKey = user.getAvatarKey();
    return {
      ...user.toJSON(),
      avatarUrl: avatarKey ? `/api/avatars/${encodeURIComponent(avatarKey)}` : null,
    };
  }

  public static space(space: StudySpace) {
    return {
      id: space.getId(),
      name: space.getName(),
      subject: space.getSubject(),
      description: space.getDescription(),
      color: space.getColor(),
      createdAt: space.getCreatedAt(),
      updatedAt: space.getUpdatedAt(),
    };
  }

  public static note(note: Note) {
    return {
      id: note.getId(),
      type: note.itemType,
      spaceId: note.getSpaceId(),
      title: note.getTitle(),
      content: note.getContent(),
      aiSummary: note.getAiSummary(),
      tags: note.getTags(),
      summary: note.summary(),
      shareToken: note.getShareToken(),
      createdAt: note.getCreatedAt(),
      updatedAt: note.getUpdatedAt(),
    };
  }

  public static quiz(quiz: Quiz, includeAnswers = true) {
    return {
      id: quiz.getId(),
      type: quiz.itemType,
      spaceId: quiz.getSpaceId(),
      title: quiz.getTitle(),
      description: quiz.getDescription(),
      summary: quiz.summary(),
      maxScore: quiz.getMaxScore(),
      timeLimitMinutes: quiz.getTimeLimitMinutes(),
      questions: quiz
        .getQuestions()
        .map((question) => Serializer.question(question, includeAnswers)),
      shareToken: quiz.getShareToken(),
      createdAt: quiz.getCreatedAt(),
      updatedAt: quiz.getUpdatedAt(),
    };
  }

  public static question(question: Question, includeAnswers = true) {
    const base = {
      id: question.getId(),
      type: question.type,
      prompt: question.getPrompt(),
      points: question.getPoints(),
      ...(includeAnswers && question.getExplanation()
        ? { explanation: question.getExplanation() }
        : {}),
    };

    if (question instanceof MCQQuestion) {
      return {
        ...base,
        options: question.getOptions(),
        ...(includeAnswers ? { correctOptionId: question.getCorrectOptionId() } : {}),
      };
    }

    if (question instanceof MultiSelectQuestion) {
      return {
        ...base,
        options: question.getOptions(),
        ...(includeAnswers ? { correctOptionIds: question.getCorrectOptionIds() } : {}),
      };
    }

    if (question instanceof TrueFalseQuestion) {
      return {
        ...base,
        ...(includeAnswers ? { correctAnswer: question.getCorrectAnswerValue() } : {}),
      };
    }

    return base;
  }

  public static attempt(attempt: QuizAttempt) {
    return {
      id: attempt.getId(),
      quizId: attempt.getQuizId(),
      userId: attempt.getUserId(),
      answers: attempt.getAnswers(),
      result: attempt.getResult(),
      score: attempt.getScore(),
      maxScore: attempt.getMaxScore(),
      percentage: attempt.getPercentage(),
      completedAt: attempt.getCompletedAt(),
    };
  }

  public static deck(deck: FlashcardDeck) {
    return {
      id: deck.getId(),
      type: deck.itemType,
      spaceId: deck.getSpaceId(),
      title: deck.getTitle(),
      description: deck.getDescription(),
      summary: deck.summary(),
      cards: deck.getCards().map((card) => ({
        id: card.getId(),
        front: card.getFront(),
        back: card.getBack(),
        easeFactor: card.getEaseFactor(),
        intervalDays: card.getIntervalDays(),
        reviewCount: card.getReviewCount(),
        lastReviewedAt: card.getLastReviewedAt(),
        nextReviewAt: card.getNextReviewAt(),
        isDue: card.isDue(),
      })),
      shareToken: deck.getShareToken(),
      createdAt: deck.getCreatedAt(),
      updatedAt: deck.getUpdatedAt(),
    };
  }

  public static revisionSchedule(schedule: RevisionSchedule, now: Date = new Date()) {
    return {
      id: schedule.getId(),
      topicId: schedule.getTopicId(),
      topicName: schedule.getTopicName(),
      memoryStrength: schedule.getMemoryStrength(),
      easeFactor: schedule.getEaseFactor(),
      intervalDays: schedule.getIntervalDays(),
      reviewCount: schedule.toReviewState().reviewCount,
      lastReviewedAt: schedule.getLastReviewedAt(),
      nextReviewAt: schedule.getNextReviewAt(),
      daysUntilReview: schedule.daysUntilReview(now),
      status: schedule.getStatus(now),
    };
  }

  public static examPlan(plan: ExamPlan) {
    return {
      id: plan.getId(),
      name: plan.getName(),
      examDate: plan.getExamDate(),
      dailyStudyHours: plan.getDailyStudyHours(),
      daysRemaining: plan.getDaysRemaining(),
      progress: plan.getProgress(),
      topics: plan.getTopics().map((topic) => ({
        id: topic.getId(),
        name: topic.getName(),
        description: topic.getDescription(),
        estimatedMinutes: topic.getEstimatedMinutes(),
      })),
      studyDays: plan.getStudyDays().map((day) => ({
        id: day.getId(),
        date: day.getDate(),
        topicIds: day.getTopicIds(),
        completedTopicIds: day.getCompletedTopicIds(),
        plannedMinutes: day.getPlannedMinutes(),
        isComplete: day.isComplete(),
        progress: day.getProgress(),
      })),
      createdAt: plan.getCreatedAt(),
      updatedAt: plan.getUpdatedAt(),
    };
  }

  public static session(session: StudySession) {
    return {
      id: session.getId(),
      spaceId: session.getSpaceId(),
      subject: session.getSubject(),
      durationMinutes: session.getDurationMinutes(),
      startedAt: session.getStartedAt(),
      endedAt: session.getEndedAt(),
      isCompleted: session.isCompleted(),
      createdAt: session.getCreatedAt(),
    };
  }

  public static bookmark(bookmark: Bookmark) {
    return {
      id: bookmark.getId(),
      itemId: bookmark.getItemId(),
      itemType: bookmark.getItemType(),
      createdAt: bookmark.getCreatedAt(),
    };
  }

  public static sharedLink(link: SharedLink) {
    return {
      id: link.getId(),
      token: link.getToken(),
      itemId: link.getItemId(),
      itemType: link.getItemType(),
      expiresAt: link.getExpiresAt(),
      revoked: link.isRevoked(),
      active: link.isActive(),
      publicPath: `/api/public/${link.getItemType() === 'note' ? 'notes' : 'quizzes'}/${link.getToken()}`,
      createdAt: link.getCreatedAt(),
    };
  }

  public static availability(availability: StudentAvailability) {
    return {
      id: availability.getId(),
      days: availability.getDays().map((day) => ({
        weekday: day.getWeekday(),
        mode: day.getMode(),
        budgetMinutes: day.getBudgetMinutes(),
        available: day.isAvailable(),
        windows: day.getWindows().map((window) => ({
          id: window.getId(),
          start: minutesToTimeString(window.getStartMinutes()),
          end: minutesToTimeString(window.getEndMinutes()),
        })),
      })),
      createdAt: availability.getCreatedAt(),
      updatedAt: availability.getUpdatedAt(),
    };
  }

  public static notification(notification: Notification) {
    return {
      id: notification.getId(),
      type: notification.getType(),
      title: notification.getTitle(),
      message: notification.getMessage(),
      read: notification.isRead(),
      createdAt: notification.getCreatedAt(),
    };
  }

  public static attentionSuggestion(suggestion: AttentionSuggestionView) {
    return {
      strategy: suggestion.strategy,
      label: suggestion.label,
      description: suggestion.description,
      targetDate: suggestion.targetDate,
      minutes: suggestion.minutes,
    };
  }

  public static attentionItem(item: AttentionItem) {
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      planId: item.planId,
      planName: item.planName,
      date: item.date,
      topicCount: item.topicCount,
      minutes: item.minutes,
      suggestions: item.suggestions.map((suggestion) => Serializer.attentionSuggestion(suggestion)),
    };
  }

  public static attentionReport(report: AttentionReport) {
    return {
      generatedAt: report.generatedAt,
      items: report.items.map((item) => Serializer.attentionItem(item)),
    };
  }

  public static appliedChange(applied: AppliedChange) {
    return {
      itemId: applied.itemId,
      strategy: applied.strategy,
      targetDate: applied.targetDate,
      minutes: applied.minutes,
      movedTopicIds: applied.movedTopicIds,
    };
  }

  public static assistantProposal(proposal: AssistantProposal) {
    return {
      understood: proposal.understood,
      action: proposal.action,
      response: proposal.response,
      planId: proposal.planId,
      planName: proposal.planName,
      strategy: proposal.strategy,
      suggestion: proposal.suggestion ? Serializer.attentionSuggestion(proposal.suggestion) : null,
      needsConfirmation: proposal.needsConfirmation,
    };
  }
}
