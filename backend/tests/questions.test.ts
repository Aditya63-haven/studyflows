import { MCQQuestion } from '../src/domain/questions/MCQQuestion';
import { MultiSelectQuestion } from '../src/domain/questions/MultiSelectQuestion';
import { TrueFalseQuestion } from '../src/domain/questions/TrueFalseQuestion';

const options = [
  { id: 'a', text: 'Option A' },
  { id: 'b', text: 'Option B' },
  { id: 'c', text: 'Option C' },
];

describe('MCQQuestion.evaluate', () => {
  const question = new MCQQuestion({
    id: 'mcq-1',
    prompt: 'Which option is correct?',
    points: 2,
    options,
    correctOptionId: 'b',
  });

  it('awards points for the correct option', () => {
    expect(question.evaluate('b')).toEqual({
      questionId: 'mcq-1',
      correct: true,
      earnedPoints: 2,
      maxPoints: 2,
      correctAnswer: ['b'],
    });
  });

  it('returns zero for a wrong option', () => {
    const result = question.evaluate('a');
    expect(result.correct).toBe(false);
    expect(result.earnedPoints).toBe(0);
  });

  it('handles empty and non-string responses', () => {
    expect(question.evaluate('').correct).toBe(false);
    expect(question.evaluate([]).correct).toBe(false);
    expect(question.evaluate(true).correct).toBe(false);
  });
});

describe('MultiSelectQuestion.evaluate', () => {
  const question = new MultiSelectQuestion({
    id: 'multi-1',
    prompt: 'Select all correct options',
    options,
    correctOptionIds: ['a', 'c'],
  });

  it('requires the exact set of correct options', () => {
    expect(question.evaluate(['a', 'c']).correct).toBe(true);
    expect(question.evaluate(['c', 'a', 'a']).correct).toBe(true);
  });

  it('rejects partial, extra and empty selections', () => {
    expect(question.evaluate(['a']).correct).toBe(false);
    expect(question.evaluate(['a', 'b', 'c']).correct).toBe(false);
    expect(question.evaluate([]).correct).toBe(false);
    expect(question.evaluate('a').correct).toBe(false);
  });
});

describe('TrueFalseQuestion.evaluate', () => {
  const trueQuestion = new TrueFalseQuestion({
    id: 'tf-1',
    prompt: 'The sky is blue',
    correctAnswer: true,
  });

  const falseQuestion = new TrueFalseQuestion({
    id: 'tf-2',
    prompt: 'The sun is cold',
    correctAnswer: false,
  });

  it('normalizes boolean and string responses', () => {
    expect(trueQuestion.evaluate(true).correct).toBe(true);
    expect(trueQuestion.evaluate('TRUE').correct).toBe(true);
    expect(trueQuestion.evaluate('false').correct).toBe(false);
    expect(falseQuestion.evaluate('False').correct).toBe(true);
  });

  it('rejects unrecognized or empty responses', () => {
    expect(trueQuestion.evaluate('yes').correct).toBe(false);
    expect(trueQuestion.evaluate('').correct).toBe(false);
    expect(falseQuestion.evaluate([]).correct).toBe(false);
  });
});
