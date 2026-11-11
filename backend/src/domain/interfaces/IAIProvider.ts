import { QuestionOption, QuestionType } from '../questions/Question';

export interface AINoteInput {
  title: string;
  content: string;
}

export interface AIQuizInput extends AINoteInput {
  questionCount?: number;
}

/**
 * Provider-neutral question data produced by an AI provider.
 */
export interface AIGeneratedQuestion {
  type: QuestionType;
  prompt: string;
  points?: number;
  explanation?: string;
  options?: QuestionOption[];
  correctOptionId?: string;
  correctOptionIds?: string[];
  correctAnswer?: boolean;
}

/**
 * Abstraction for AI-backed study features.
 *
 * OOP: Abstraction - note condensation and quiz generation depend only on this interface.
 * OOP: Adapter - concrete providers adapt external or mock backends to this contract.
 */
export interface IAIProvider {
  readonly name: string;
  summarizeNote(input: AINoteInput): Promise<string>;
  generateQuiz(input: AIQuizInput): Promise<AIGeneratedQuestion[]>;
}
