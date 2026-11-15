import apiClient from './client';
import {
  ExamPlan,
  ExamPlanInput,
  ExamPreparationApprovalInput,
  ExamPreparationApprovalResult,
  ExamPreparationOverview,
  ExamPreparationPreview,
  ExamPreparationSelection,
} from './types';

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

  async getPreparation(
    planId: string,
    spaceId?: string | null,
  ): Promise<ExamPreparationOverview> {
    const { data } = await apiClient.get<{ preparation: ExamPreparationOverview }>(
      `/exam-plans/${planId}/preparation`,
      spaceId ? { params: { spaceId } } : undefined,
    );
    return data.preparation;
  },

  async previewPreparation(
    planId: string,
    input: ExamPreparationSelection,
  ): Promise<ExamPreparationPreview> {
    const { data } = await apiClient.post<{ preparation: ExamPreparationPreview }>(
      `/exam-plans/${planId}/preparation/preview`,
      input,
    );
    return data.preparation;
  },

  async approvePreparation(
    planId: string,
    input: ExamPreparationApprovalInput,
  ): Promise<ExamPreparationApprovalResult> {
    const { data } = await apiClient.post<ExamPreparationApprovalResult>(
      `/exam-plans/${planId}/preparation/approve`,
      input,
    );
    return data;
  },
};
