import apiClient from './client';
import {
  AppliedChange,
  AttentionReport,
  ExamPlan,
  RescheduleStrategyName,
} from './types';

export const attentionApi = {
  async list(): Promise<AttentionReport> {
    const { data } = await apiClient.get<{ attention: AttentionReport }>('/attention');
    return data.attention;
  },

  async apply(id: string, strategy: RescheduleStrategyName): Promise<{
    examPlan: ExamPlan;
    applied: AppliedChange;
  }> {
    const { data } = await apiClient.post<{ examPlan: ExamPlan; applied: AppliedChange }>(
      `/attention/${id}/apply`,
      { strategy },
    );
    return data;
  },
};
