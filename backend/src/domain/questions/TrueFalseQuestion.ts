import { ValidationError } from '../../errors';
import {
  Question,
  QuestionEvaluation,
  QuestionProps,
  QuestionResponse,
} from './Question';

export interface TrueFalseQuestionProps extends QuestionProps {
  correctAnswer: boolean;
}

/**
 * True/false question.
 *
 * OOP: Inheritance - extends Question.
 * OOP: Polymorphism - evaluate() normalizes boolean and string responses.
 */
export class TrueFalseQuestion extends Question {
  public override readonly type = 'true_false' as const;

  private readonly _correctAnswer: boolean;

  constructor(props: TrueFalseQuestionProps) {
    super(props);
    if (typeof props.correctAnswer !== 'boolean') {
      throw new ValidationError('correctAnswer must be a boolean');
    }
    this._correctAnswer = props.correctAnswer;
  }

  public getCorrectAnswerValue(): boolean {
    return this._correctAnswer;
  }

  public evaluate(response: QuestionResponse): QuestionEvaluation {
    let selected: boolean | null = null;

    if (typeof response === 'boolean') {
      selected = response;
    } else if (typeof response === 'string') {
      const normalized = response.trim().toLowerCase();
      if (normalized === 'true') {
        selected = true;
      } else if (normalized === 'false') {
        selected = false;
      }
    }

    return this.buildEvaluation(selected === this._correctAnswer, [String(this._correctAnswer)]);
  }

  public getCorrectAnswer(): string[] {
    return [String(this._correctAnswer)];
  }
}
