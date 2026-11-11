import { Quiz } from '../src/domain/entities/Quiz';
import { MCQQuestion } from '../src/domain/questions/MCQQuestion';
import { MultiSelectQuestion } from '../src/domain/questions/MultiSelectQuestion';
import { TrueFalseQuestion } from '../src/domain/questions/TrueFalseQuestion';

const options = [
  { id: 'a', text: 'Option A' },
  { id: 'b', text: 'Option B' },
  { id: 'c', text: 'Option C' },
];

const mcq = new MCQQuestion({
  id: 'q-mcq',
  prompt: 'Single answer',
  points: 2,
  options,
  correctOptionId: 'a',
});

const multi = new MultiSelectQuestion({
  id: 'q-multi',
  prompt: 'Multiple answers',
  points: 3,
  options,
  correctOptionIds: ['a', 'c'],
});

const trueFalse = new TrueFalseQuestion({
  id: 'q-tf',
  prompt: 'True or false',
  points: 1,
  correctAnswer: true,
});

const quiz = new Quiz({
  id: 'quiz-1',
  title: 'Mixed quiz',
  ownerId: 'owner-1',
  spaceId: 'space-1',
  questions: [mcq, multi, trueFalse],
});

describe('Quiz.grade', () => {
  it('grades mixed question subtypes without type checks', () => {
    const result = quiz.grade([
      { questionId: 'q-mcq', response: 'a' },
      { questionId: 'q-multi', response: ['a', 'c'] },
      { questionId: 'q-tf', response: true },
    ]);

    expect(result.score).toBe(6);
    expect(result.maxScore).toBe(6);
    expect(result.percentage).toBe(100);
    expect(result.evaluations.map((evaluation) => evaluation.correct)).toEqual([true, true, true]);
  });

  it('supports partially correct attempts', () => {
    const result = quiz.grade([
      { questionId: 'q-mcq', response: 'a' },
      { questionId: 'q-multi', response: ['a'] },
      { questionId: 'q-tf', response: true },
    ]);

    expect(result.score).toBe(3);
    expect(result.percentage).toBe(50);
    expect(result.evaluations.map((evaluation) => evaluation.correct)).toEqual([true, false, true]);
  });

  it('treats missing answers as incorrect', () => {
    const result = quiz.grade([]);

    expect(result.score).toBe(0);
    expect(result.maxScore).toBe(6);
    expect(result.percentage).toBe(0);
    expect(result.evaluations.every((evaluation) => !evaluation.correct)).toBe(true);
  });
});

describe('Quiz.summary', () => {
  it('reports question count and maximum points', () => {
    expect(quiz.summary()).toBe('3 questions, 6 points');
  });
});
