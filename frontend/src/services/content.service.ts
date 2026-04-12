import api from './api';
import {
  ApiResponse,
  Content,
  CreateContentPayload,
  UpdateContentPayload,
  PaginatedResponse,
  ContentFilters,
  TagEntry,
  UploadResult,
} from '../types';


export const contentService = {
  create: async (data: CreateContentPayload): Promise<Content> => {
    const res = await api.post<ApiResponse<Content>>('/content', data);
    return res.data.data!;
  },

  getAll: async (
    filters: ContentFilters & { page?: number; limit?: number }
  ): Promise<PaginatedResponse<Content>> => {
    const params: Record<string, string> = {};
    if (filters.q) params.q = filters.q;
    if (filters.type) params.type = filters.type;
    if (filters.tags) params.tags = filters.tags;
    if (filters.sort) params.sort = filters.sort;
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);

    const res = await api.get<ApiResponse<PaginatedResponse<Content>>>('/content', { params });
    return res.data.data!;
  },

  update: async (id: string, data: UpdateContentPayload): Promise<Content> => {
    const res = await api.put<ApiResponse<Content>>(`/content/${id}`, data);
    return res.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/content/${id}`);
  },

  getTags: async (): Promise<TagEntry[]> => {
    const res = await api.get<ApiResponse<TagEntry[]>>('/content/tags');
    return res.data.data!;
  },

  /** Fetch URL metadata without creating a content record */
  previewUrl: async (url: string): Promise<Content['metadata']> => {
    const res = await api.post<ApiResponse<Content['metadata']>>('/content/preview', { url });
    return res.data.data;
  },

  uploadFile: async (file: File, onProgress?: (pct: number) => void): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<ApiResponse<UploadResult>>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
    return res.data.data!;
  },

  /**
   * Request a presigned (temporary) URL for a private S3 object.
   * `key` is the S3 object key, e.g. "knowledge_vault/<userId>/<uuid>.jpg".
   * The returned URL is valid for 1 hour.
   * If `downloadName` is provided, the URL will force a file download.
   */
  getSignedUrl: async (key: string, downloadName?: string): Promise<string> => {
    const params: Record<string, string> = { key };
    if (downloadName) params.downloadName = downloadName;

    const res = await api.get<ApiResponse<{ url: string }>>('/upload/signed-url', {
      params,
    });
    return res.data.data!.url;
  },
};

