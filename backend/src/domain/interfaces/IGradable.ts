import { QuestionEvaluation, QuestionResponse } from '../questions/Question';

/**
 * One answer submitted for a quiz question.
 */
export interface QuizAnswer {
  questionId: string;
  response: QuestionResponse;
}

/**
 * Result of grading a complete quiz submission.
 */
export interface QuizGradeResult {
  score: number;
  maxScore: number;
  percentage: number;
  evaluations: QuestionEvaluation[];
}

/**
 * Small interface for anything that can be auto-graded.
 *
 * OOP: ISP - only the grading capability is required, not a large quiz contract.
 */
export interface IGradable {
  grade(answers: QuizAnswer[]): QuizGradeResult;
  getMaxScore(): number;
}
