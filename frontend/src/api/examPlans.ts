import apiClient from './client';
import { ExamPlan, ExamPlanInput } from './types';

export const examPlansApi = {
  async list(): Promise<ExamPlan[]> {
    const { data } = await apiClient.get<{ examPlans: ExamPlan[] }>('/exam-plans');
    return data.examPlans;
  },

  async get(id: string): Promise<ExamPlan> {
    const { data } = await apiClient.get<{ examPlan: ExamPlan }>(
      `/exam-plans/${id}`,
    );
    return data.examPlan;
  },

  async create(input: ExamPlanInput): Promise<ExamPlan> {
    const { data } = await apiClient.post<{ examPlan: ExamPlan }>(
      '/exam-plans',
      input,
    );
    return data.examPlan;
  },

  async update(
    id: string,
    input: Partial<Pick<ExamPlanInput, 'name' | 'examDate' | 'dailyStudyHours'>>,
  ): Promise<ExamPlan> {
    const { data } = await apiClient.patch<{ examPlan: ExamPlan }>(
      `/exam-plans/${id}`,
      input,
    );
    return data.examPlan;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/exam-plans/${id}`);
  },

  async markTopicComplete(
    planId: string,
    topicId: string,
    dayId?: string,
  ): Promise<ExamPlan> {
    const { data } = await apiClient.post<{ examPlan: ExamPlan }>(
      `/exam-plans/${planId}/topics/${topicId}/complete`,
      dayId ? { dayId } : {},
    );
    return data.examPlan;
  },
};
