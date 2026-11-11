import apiClient from './client';
import {
  AppliedChange,
  AssistantProposal,
  ExamPlan,
  RescheduleStrategyName,
} from './types';

export const assistantApi = {
  async command(text: string): Promise<AssistantProposal> {
    const { data } = await apiClient.post<{ proposal: AssistantProposal }>(
      '/assistant/command',
      { text },
    );
    return data.proposal;
  },

  async apply(
    planId: string,
    strategy: RescheduleStrategyName,
  ): Promise<{ examPlan: ExamPlan; applied: AppliedChange }> {
    const { data } = await apiClient.post<{ examPlan: ExamPlan; applied: AppliedChange }>(
      '/assistant/apply',
      { planId, strategy },
    );
    return data;
  },
};
