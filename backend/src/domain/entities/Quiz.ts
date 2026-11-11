import { ValidationError } from '../../errors';
import { StudyItem, StudyItemProps, StudyItemType } from '../base/StudyItem';
import { requireNonEmpty, requireNumberInRange, requireString, roundTo } from '../base/helpers';
import { IGradable, QuizAnswer, QuizGradeResult } from '../interfaces/IGradable';
import { Question } from '../questions/Question';

export interface QuizProps extends StudyItemProps {
  spaceId: string;
  description?: string;
  questions?: Question[];
  timeLimitMinutes?: number | null;
}

/**
 * Quiz containing a mixed collection of Question subtypes.
 *
 * OOP: Inheritance - Quiz is a StudyItem.
 * OOP: Composition - a Quiz owns its Questions; they are created and replaced
 * through the quiz.
 * OOP: Association - belongs to a StudySpace through `spaceId`.
 * OOP: Polymorphism - grade() calls evaluate() on each question without checking
 * its concrete type.
 */
export class Quiz extends StudyItem implements IGradable {
  private _spaceId: string;
  private _description: string;
  private _questions: Question[];
  private _timeLimitMinutes: number | null;

  constructor(props: QuizProps) {
    super(props);
    this._spaceId = requireNonEmpty(props.spaceId, 'spaceId');
    this._description = requireString(props.description ?? '', 'description');
    this._questions = [];
    this._timeLimitMinutes =
      props.timeLimitMinutes == null
        ? null
        : requireNumberInRange(props.timeLimitMinutes, 'timeLimitMinutes', 1, 600);
    this.setQuestions(props.questions ?? []);
  }

  public get itemType(): StudyItemType {
    return 'quiz';
  }

  public getSpaceId(): string {
    return this._spaceId;
  }

  public setSpaceId(spaceId: string): void {
    this._spaceId = requireNonEmpty(spaceId, 'spaceId');
    this.touch();
  }

  public getDescription(): string {
    return this._description;
  }

  public setDescription(description: string): void {
    this._description = requireString(description, 'description');
    this.touch();
  }

  public getQuestions(): readonly Question[] {
    return [...this._questions];
  }

  public setQuestions(questions: Question[]): void {
    if (!Array.isArray(questions)) {
      throw new ValidationError('questions must be an array');
    }

    const ids = new Set<string>();
    for (const question of questions) {
      if (!(question instanceof Question)) {
        throw new ValidationError('every question must be a Question instance');
      }
      if (ids.has(question.getId())) {
        throw new ValidationError(`Duplicate question id: ${question.getId()}`);
      }
      ids.add(question.getId());
    }

    this._questions = [...questions];
    this.touch();
  }

  public addQuestion(question: Question): void {
    if (this._questions.some((existing) => existing.getId() === question.getId())) {
      throw new ValidationError(`Duplicate question id: ${question.getId()}`);
    }
    this._questions.push(question);
    this.touch();
  }

  public removeQuestion(questionId: string): boolean {
    const before = this._questions.length;
    this._questions = this._questions.filter((question) => question.getId() !== questionId);
    const removed = this._questions.length !== before;
    if (removed) {
      this.touch();
    }
    return removed;
  }

  public getTimeLimitMinutes(): number | null {
    return this._timeLimitMinutes;
  }

  public setTimeLimitMinutes(minutes: number | null): void {
    this._timeLimitMinutes =
      minutes == null ? null : requireNumberInRange(minutes, 'timeLimitMinutes', 1, 600);
    this.touch();
  }

  public getMaxScore(): number {
    return roundTo(
      this._questions.reduce((total, question) => total + question.getPoints(), 0),
    );
  }

  /**
   * Grades answers over mixed question types.
   *
   * OOP: Polymorphism - the loop is generic; each Question subclass decides how
   * its own response is evaluated.
   */
  public grade(answers: QuizAnswer[]): QuizGradeResult {
    const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));

    const evaluations = this._questions.map((question) => {
      const answer = answerByQuestion.get(question.getId());
      return question.evaluate(answer?.response ?? '');
    });

    const score = roundTo(
      evaluations.reduce((total, evaluation) => total + evaluation.earnedPoints, 0),
    );
    const maxScore = this.getMaxScore();
    const percentage = maxScore === 0 ? 0 : roundTo((score / maxScore) * 100);

    return { score, maxScore, percentage, evaluations };
  }

  /**
   * OOP: Polymorphism - Quiz overrides the abstract StudyItem.summary().
   */
  public summary(): string {
    return `${this._questions.length} questions, ${this.getMaxScore()} points`;
  }
}
