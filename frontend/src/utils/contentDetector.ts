import { ContentType } from '../types';

const URL_REGEX = /^(https?:\/\/)([^\s$.?#].[^\s]*)$/i;
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];

export const isUrl = (text: string): boolean => URL_REGEX.test(text.trim());

export const detectContentType = (input: string | File): ContentType => {
  if (input instanceof File) {
    return IMAGE_MIMES.includes(input.type) ? 'image' : 'file';
  }
  const trimmed = input.trim();
  if (isUrl(trimmed)) return 'link';
  return 'text';
};

export const extractHashtags = (text: string): string[] => {
  const matches = text.matchAll(/#([a-zA-Z0-9_]+)/g);
  return [...new Set([...matches].map((m) => m[1].toLowerCase()))];
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const getContentTypeIcon = (type: ContentType): string => {
  const icons: Record<ContentType, string> = {
    text: '📝',
    link: '🔗',
    image: '🖼️',
    file: '📎',
  };
  return icons[type];
};

export const getContentTypeColor = (type: ContentType): string => {
  const colors: Record<ContentType, string> = {
    text: 'type-text',
    link: 'type-link',
    image: 'type-image',
    file: 'type-file',
  };
  return colors[type];
};
