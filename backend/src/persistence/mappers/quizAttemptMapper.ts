import { QuizAttempt } from '../../domain/entities/QuizAttempt';
import { QuizAttemptDocument } from '../schemas/quizAttempt.schema';

export class QuizAttemptMapper {
  public static toDomain(document: QuizAttemptDocument): QuizAttempt {
    return new QuizAttempt({
      id: document._id,
      quizId: document.quizId,
      userId: document.owner,
      answers: document.answers.map((answer) => ({
        questionId: answer.questionId,
        response: answer.response,
      })),
      result: {
        score: document.result.score,
        maxScore: document.result.maxScore,
        percentage: document.result.percentage,
        evaluations: document.result.evaluations.map((evaluation) => ({
          questionId: evaluation.questionId,
          correct: evaluation.correct,
          earnedPoints: evaluation.earnedPoints,
          maxPoints: evaluation.maxPoints,
          correctAnswer: evaluation.correctAnswer,
          explanation: evaluation.explanation,
        })),
      },
      completedAt: document.completedAt,
    });
  }

  public static toPersistence(attempt: QuizAttempt): QuizAttemptDocument {
    const result = attempt.getResult();
    return {
      _id: attempt.getId(),
      owner: attempt.getUserId(),
      quizId: attempt.getQuizId(),
      answers: attempt.getAnswers(),
      result: {
        score: result.score,
        maxScore: result.maxScore,
        percentage: result.percentage,
        evaluations: result.evaluations,
      },
      completedAt: attempt.getCompletedAt(),
      createdAt: attempt.getCompletedAt(),
      updatedAt: attempt.getCompletedAt(),
    };
  }
}
