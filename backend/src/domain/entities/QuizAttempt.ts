import { QuizAnswer, QuizGradeResult } from '../interfaces/IGradable';
import { requireDate, requireNonEmpty, requireNumberInRange, resolveId, roundTo } from '../base/helpers';

export interface QuizAttemptProps {
  id?: string;
  quizId: string;
  userId: string;
  answers: QuizAnswer[];
  result: QuizGradeResult;
  completedAt?: Date;
}

/**
 * A stored attempt at a quiz.
 *
 * OOP: Association - a QuizAttempt refers to one Quiz through `quizId`.
 * OOP: Encapsulation - answers and grading results are defensively copied.
 */
export class QuizAttempt {
  private readonly _id: string;
  private readonly _quizId: string;
  private readonly _userId: string;
  private readonly _answers: QuizAnswer[];
  private readonly _result: QuizGradeResult;
  private readonly _completedAt: Date;

  constructor(props: QuizAttemptProps) {
    this._id = resolveId(props.id);
    this._quizId = requireNonEmpty(props.quizId, 'quizId');
    this._userId = requireNonEmpty(props.userId, 'userId');
    this._answers = props.answers.map((answer) => ({
      questionId: answer.questionId,
      response: Array.isArray(answer.response) ? [...answer.response] : answer.response,
    }));
    this._result = {
      ...props.result,
      score: requireNumberInRange(props.result.score, 'score', 0, props.result.maxScore),
      maxScore: requireNumberInRange(props.result.maxScore, 'maxScore', 0, 10_000),
      percentage: requireNumberInRange(props.result.percentage, 'percentage', 0, 100),
      evaluations: props.result.evaluations.map((evaluation) => ({
        ...evaluation,
        correctAnswer: [...evaluation.correctAnswer],
      })),
    };
    this._completedAt = props.completedAt
      ? requireDate(props.completedAt, 'completedAt')
      : new Date();
  }

  public getId(): string {
    return this._id;
  }

  public getQuizId(): string {
    return this._quizId;
  }

  public getUserId(): string {
    return this._userId;
  }

  public getAnswers(): QuizAnswer[] {
    return this._answers.map((answer) => ({
      questionId: answer.questionId,
      response: Array.isArray(answer.response) ? [...answer.response] : answer.response,
    }));
  }

  public getResult(): QuizGradeResult {
    return {
      ...this._result,
      evaluations: this._result.evaluations.map((evaluation) => ({
        ...evaluation,
        correctAnswer: [...evaluation.correctAnswer],
      })),
    };
  }

  public getScore(): number {
    return this._result.score;
  }

  public getMaxScore(): number {
    return this._result.maxScore;
  }

  public getPercentage(): number {
    return roundTo(this._result.percentage);
  }

  public getCompletedAt(): Date {
    return new Date(this._completedAt.getTime());
  }
}
