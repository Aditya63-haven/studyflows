import apiClient from './client';
import {
  AppliedChange,
  AssistantChatInput,
  AssistantChatResult,
  AssistantPerformanceResult,
  AssistantProposal,
  ExamPlan,
  PerformanceFilters,
  RescheduleStrategyName,
} from './types';

export const assistantApi = {
  async chat(input: AssistantChatInput): Promise<AssistantChatResult> {
    const { data } = await apiClient.post<{ result: AssistantChatResult }>(
      '/assistant/chat',
      input,
    );
    return data.result;
  },

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

  async performance(filters: PerformanceFilters = {}): Promise<AssistantPerformanceResult> {
    const { data } = await apiClient.post<{ result: AssistantPerformanceResult }>(
      '/assistant/performance',
      filters,
    );
    return data.result;
  },
};
