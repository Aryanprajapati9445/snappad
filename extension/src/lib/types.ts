// Shared types for the extension — mirrors frontend/src/types/index.ts (no import dependency)

export type ContentType = 'text' | 'link' | 'image' | 'file';

export interface ContentMetadata {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  domain?: string;
  author?: string;
  siteName?: string;
}

export interface Content {
  _id: string;
  type: ContentType;
  content?: string;
  title?: string;
  tags: string[];
  isPinned: boolean;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  metadata?: ContentMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  code?: string;
  data?: T;
  accessToken?: string;
}


export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreateContentPayload {
  type: ContentType;
  content?: string;
  title?: string;
  tags?: string[];
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  metadata?: ContentMetadata;
}

export type StorageData = {
  token?: string;
  refreshToken?: string;
  user?: User;
  apiBase?: string;
};


export interface UploadResult {
  url: string;
  publicId: string;
  resourceType: 'image' | 'video' | 'raw';
  format: string;
  bytes: number;
}

