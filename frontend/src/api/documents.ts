import apiClient from './client';
import { StudyDocument } from './types';

export const documentsApi = {
  async listBySpace(spaceId: string): Promise<StudyDocument[]> {
    const { data } = await apiClient.get<{ documents: StudyDocument[] }>(
      `/spaces/${spaceId}/documents`,
    );
    return data.documents;
  },

  async upload(spaceId: string, file: File): Promise<StudyDocument> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post<{ document: StudyDocument }>(
      `/spaces/${spaceId}/documents`,
      form,
    );
    return data.document;
  },

  async download(id: string): Promise<Blob> {
    const { data } = await apiClient.get<Blob>(`/documents/${id}/file`, {
      responseType: 'blob',
    });
    return data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/documents/${id}`);
  },
};
