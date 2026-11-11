import apiClient from './client';
import { SpaceInput, StudySpace } from './types';

export const spacesApi = {
  async list(): Promise<StudySpace[]> {
    const { data } = await apiClient.get<{ spaces: StudySpace[] }>('/spaces');
    return data.spaces;
  },

  async get(id: string): Promise<StudySpace> {
    const { data } = await apiClient.get<{ space: StudySpace }>(`/spaces/${id}`);
    return data.space;
  },

  async create(input: SpaceInput): Promise<StudySpace> {
    const { data } = await apiClient.post<{ space: StudySpace }>('/spaces', input);
    return data.space;
  },

  async update(id: string, input: Partial<SpaceInput>): Promise<StudySpace> {
    const { data } = await apiClient.patch<{ space: StudySpace }>(
      `/spaces/${id}`,
      input,
    );
    return data.space;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/spaces/${id}`);
  },
};
