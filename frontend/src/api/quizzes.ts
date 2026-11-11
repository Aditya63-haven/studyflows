import apiClient from './client';
import { Quiz, QuizAnswer, QuizAttempt, QuizInput } from './types';

export const quizzesApi = {
  async listBySpace(spaceId: string): Promise<Quiz[]> {
    const { data } = await apiClient.get<{ quizzes: Quiz[] }>(
      `/spaces/${spaceId}/quizzes`,
    );
    return data.quizzes;
  },

  async get(id: string): Promise<Quiz> {
    const { data } = await apiClient.get<{ quiz: Quiz }>(`/quizzes/${id}`);
    return data.quiz;
  },

  async create(spaceId: string, input: QuizInput): Promise<Quiz> {
    const { data } = await apiClient.post<{ quiz: Quiz }>(
      `/spaces/${spaceId}/quizzes`,
      input,
    );
    return data.quiz;
  },

  async update(id: string, input: Partial<QuizInput>): Promise<Quiz> {
    const { data } = await apiClient.patch<{ quiz: Quiz }>(`/quizzes/${id}`, input);
    return data.quiz;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/quizzes/${id}`);
  },

  async submit(id: string, answers: QuizAnswer[]): Promise<QuizAttempt> {
    const { data } = await apiClient.post<{ attempt: QuizAttempt }>(
      `/quizzes/${id}/attempts`,
      { answers },
    );
    return data.attempt;
  },

  async attempts(id: string): Promise<QuizAttempt[]> {
    const { data } = await apiClient.get<{ attempts: QuizAttempt[] }>(
      `/quizzes/${id}/attempts`,
    );
    return data.attempts;
  },
};
