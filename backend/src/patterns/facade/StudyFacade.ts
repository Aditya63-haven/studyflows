import { ValidationError } from '../../errors';
import { ExamPlanBuilder } from '../builder/ExamPlanBuilder';
import { EventBus } from '../observer/EventBus';
import { QuestionFactory, QuestionFactoryInput } from '../factory/QuestionFactory';
import {
  AIGeneratedQuestion,
  IAIProvider,
} from '../../domain/interfaces/IAIProvider';
import { IRevisionStrategy, ReviewRating } from '../../domain/interfaces/IRevisionStrategy';
import { QuizAnswer } from '../../domain/interfaces/IGradable';
import { Note } from '../../domain/entities/Note';
import { Quiz } from '../../domain/entities/Quiz';
import { QuizAttempt } from '../../domain/entities/QuizAttempt';
import { RevisionSchedule } from '../../domain/entities/RevisionSchedule';
import { ExamPlan } from '../../domain/entities/ExamPlan';

export interface StudyFacadeDependencies {
  aiProvider: IAIProvider;
  revisionStrategy: IRevisionStrategy;
  eventBus: EventBus;
}

/**
 * Facade used by controllers for cross-feature study workflows.
 *
 * OOP: Facade - hides the coordination between AI providers, question factory,
 * strategies, grading and event publication behind a small API.
 * OOP: DIP - dependencies are injected as abstractions.
 */
export class StudyFacade {
  constructor(private readonly dependencies: StudyFacadeDependencies) {}

  /**
   * Condenses a note through the configured AI provider and stores the result.
   */
  public async condenseNote(note: Note): Promise<string> {
    const summary = await this.dependencies.aiProvider.summarizeNote({
      title: note.getTitle(),
      content: note.getContent(),
    });
    note.setAiSummary(summary);
    return summary;
  }

  /**
   * Generates a quiz from a note and builds all Question subtypes through the factory.
   */
  public async generateQuizFromNote(note: Note): Promise<Quiz> {
    const generated = await this.dependencies.aiProvider.generateQuiz({
      title: note.getTitle(),
      content: note.getContent(),
    });

    if (generated.length === 0) {
      throw new ValidationError('AI provider did not generate any questions');
    }

    const questions = generated.map((question) =>
      QuestionFactory.create(this.toFactoryInput(question)),
    );

    return new Quiz({
      title: `${note.getTitle()} quiz`,
      ownerId: note.getOwnerId(),
      spaceId: note.getSpaceId(),
      description: `Generated from "${note.getTitle()}"`,
      questions,
    });
  }

  /**
   * Grades a quiz, creates a stored attempt and publishes QuizCompleted.
   */
  public async gradeAndRecordAttempt(
    quiz: Quiz,
    userId: string,
    answers: QuizAnswer[],
    completedAt: Date = new Date(),
  ): Promise<QuizAttempt> {
    const result = quiz.grade(answers);
    const attempt = new QuizAttempt({
      quizId: quiz.getId(),
      userId,
      answers,
      result,
      completedAt,
    });

    await this.dependencies.eventBus.publish({
      type: 'quiz.completed',
      occurredAt: completedAt,
      attemptId: attempt.getId(),
      quizId: quiz.getId(),
      quizTitle: quiz.getTitle(),
      spaceId: quiz.getSpaceId(),
      userId,
      score: attempt.getScore(),
      maxScore: attempt.getMaxScore(),
      percentage: attempt.getPercentage(),
    });

    return attempt;
  }

  /**
   * Applies the configured revision strategy to a schedule.
   */
  public applyRevision(
    schedule: RevisionSchedule,
    rating: ReviewRating,
    now: Date = new Date(),
  ): RevisionSchedule {
    const result = this.dependencies.revisionStrategy.calculateNextReview(
      schedule.toReviewState(),
      rating,
      now,
    );
    schedule.applyReview(result);
    return schedule;
  }

  /**
   * Builds an exam plan using the fluent builder.
   */
  public buildExamPlan(builder: ExamPlanBuilder, now: Date = new Date()): ExamPlan {
    return builder.build(now);
  }

  private toFactoryInput(question: AIGeneratedQuestion): QuestionFactoryInput {
    switch (question.type) {
      case 'mcq':
        if (!question.options || !question.correctOptionId) {
          throw new ValidationError('AI provider returned an incomplete MCQ question');
        }
        return {
          type: 'mcq',
          prompt: question.prompt,
          points: question.points,
          explanation: question.explanation,
          options: question.options,
          correctOptionId: question.correctOptionId,
        };
      case 'multi_select':
        if (!question.options || !question.correctOptionIds?.length) {
          throw new ValidationError(
            'AI provider returned an incomplete multi-select question',
          );
        }
        return {
          type: 'multi_select',
          prompt: question.prompt,
          points: question.points,
          explanation: question.explanation,
          options: question.options,
          correctOptionIds: question.correctOptionIds,
        };
      case 'true_false':
        if (typeof question.correctAnswer !== 'boolean') {
          throw new ValidationError(
            'AI provider returned an incomplete true/false question',
          );
        }
        return {
          type: 'true_false',
          prompt: question.prompt,
          points: question.points,
          explanation: question.explanation,
          correctAnswer: question.correctAnswer,
        };
      default:
        throw new ValidationError('AI provider returned an unsupported question type');
    }
  }
}
