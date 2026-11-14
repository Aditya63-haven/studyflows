import apiClient from './client';
import { AiAccessGrant, AiAccessStatus } from './types';

export const aiAccessApi = {
  async status(): Promise<AiAccessStatus> {
    const { data } = await apiClient.get<{ status: AiAccessStatus }>(
      '/ai-access/status',
    );
    return data.status;
  },

  async list(): Promise<AiAccessGrant[]> {
    const { data } = await apiClient.get<{ grants: AiAccessGrant[] }>(
      '/ai-access/grants',
    );
    return data.grants;
  },

  async grant(email: string): Promise<AiAccessGrant> {
    const { data } = await apiClient.post<{ grant: AiAccessGrant }>(
      '/ai-access/grants',
      { email },
    );
    return data.grant;
  },

  async revoke(id: string): Promise<AiAccessGrant> {
    const { data } = await apiClient.delete<{ grant: AiAccessGrant }>(
      `/ai-access/grants/${id}`,
    );
    return data.grant;
  },
};
