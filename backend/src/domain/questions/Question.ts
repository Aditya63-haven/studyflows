import { ValidationError } from '../../errors';
import { requireNonEmpty, requireNumberInRange, resolveId } from '../base/helpers';

export type QuestionType = 'mcq' | 'multi_select' | 'true_false';

export type QuestionResponse = string | string[] | boolean;

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuestionProps {
  id?: string;
  prompt: string;
  points?: number;
  explanation?: string;
}

export interface QuestionEvaluation {
  questionId: string;
  correct: boolean;
  earnedPoints: number;
  maxPoints: number;
  correctAnswer: string[];
  explanation?: string;
}

/**
 * Base type for every quiz question.
 *
 * OOP: Abstraction - declares `evaluate()` and `getCorrectAnswer()` without
 * knowing the concrete question format.
 * OOP: Inheritance - MCQQuestion, MultiSelectQuestion and TrueFalseQuestion extend it.
 * OOP: Encapsulation - prompt, points and explanation have validated access.
 */
export abstract class Question {
  private _id: string;
  private _prompt: string;
  private _points: number;
  private _explanation: string | undefined;

  constructor(props: QuestionProps) {
    this._id = resolveId(props.id);
    this._prompt = requireNonEmpty(props.prompt, 'prompt');
    this._points = requireNumberInRange(props.points ?? 1, 'points', 0.01, 100);
    this._explanation = props.explanation?.trim() || undefined;
  }

  public getId(): string {
    return this._id;
  }

  public getPrompt(): string {
    return this._prompt;
  }

  public setPrompt(prompt: string): void {
    this._prompt = requireNonEmpty(prompt, 'prompt');
  }

  public getPoints(): number {
    return this._points;
  }

  public setPoints(points: number): void {
    this._points = requireNumberInRange(points, 'points', 0.01, 100);
  }

  public getExplanation(): string | undefined {
    return this._explanation;
  }

  public setExplanation(explanation: string | null | undefined): void {
    this._explanation = explanation?.trim() || undefined;
  }

  public abstract readonly type: QuestionType;

  /**
   * Evaluates a student response for this specific question format.
   *
   * OOP: Polymorphism - every subtype provides its own implementation.
   */
  public abstract evaluate(response: QuestionResponse): QuestionEvaluation;

  public abstract getCorrectAnswer(): string[];

  protected buildEvaluation(correct: boolean, correctAnswer: string[]): QuestionEvaluation {
    return {
      questionId: this._id,
      correct,
      earnedPoints: correct ? this._points : 0,
      maxPoints: this._points,
      correctAnswer,
      ...(this._explanation ? { explanation: this._explanation } : {}),
    };
  }

  protected static validateOptions(options: QuestionOption[]): QuestionOption[] {
    if (!Array.isArray(options) || options.length < 2) {
      throw new ValidationError('A question requires at least two options');
    }

    const seenIds = new Set<string>();
    return options.map((option) => {
      if (!option || typeof option !== 'object') {
        throw new ValidationError('Every option must be an object');
      }
      const id = requireNonEmpty(option.id, 'option.id');
      const text = requireNonEmpty(option.text, 'option.text');
      if (seenIds.has(id)) {
        throw new ValidationError(`Duplicate option id: ${id}`);
      }
      seenIds.add(id);
      return { id, text };
    });
  }
}
