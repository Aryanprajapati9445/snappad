// ===================== User Types =====================
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  picture?: string; // Google OAuth profile picture URL
}

// ===================== Content Types =====================
export type ContentType = 'text' | 'link' | 'image' | 'file';

export interface ContentMetadata {
  title?: string;
  description?: string;
  image?: string;
  domain?: string;
  favicon?: string;
}

export interface Content {
  _id: string;
  userId: string;
  type: ContentType;
  title?: string;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  metadata?: ContentMetadata;
  tags: string[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContentFilters {
  q?: string;
  type?: ContentType | '';
  tags?: string;
  sort?: 'newest' | 'oldest' | 'pinned';
}

// ===================== Pagination =====================
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}

// ===================== API Response =====================
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}

// ===================== Forms =====================
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface CreateContentPayload {
  type: ContentType;
  title?: string;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  tags?: string[];
  metadata?: ContentMetadata;
}

export interface UpdateContentPayload {
  title?: string;
  content?: string;
  tags?: string[];
  isPinned?: boolean;
}

// ===================== Upload =====================
export interface UploadResult {
  url: string;
  publicId: string;
  fileName: string;
  fileSize: number;
  fileMimeType: string;
  resourceType: string;
  width?: number;
  height?: number;
}

// ===================== Tag Cloud =====================
export interface TagEntry {
  tag: string;
  count: number;
}
