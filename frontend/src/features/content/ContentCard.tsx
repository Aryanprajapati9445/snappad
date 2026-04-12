import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Content } from '../../types';
import { contentService } from '../../services/content.service';
import { formatDate, formatFileSize, getContentTypeColor, getContentTypeIcon } from '../../utils/contentDetector';
import EditModal from './EditModal';

interface ContentCardProps {
  item: Content;
  viewMode: 'grid' | 'list';
  onView: (item: Content) => void;
}

/** Common MIME type → file extension map */
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/bmp': '.bmp',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/zip': '.zip',
  'application/x-rar-compressed': '.rar',
  'application/x-7z-compressed': '.7z',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'text/html': '.html',
  'application/json': '.json',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/x-matroska': '.mkv',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/ogg': '.ogg',
};

function ensureExtension(fileName: string, mimeType?: string): string {
  const base = fileName.split('/').pop() ?? fileName;
  if (base.includes('.')) return base;
  const ext = mimeType ? (MIME_TO_EXT[mimeType] ?? '') : '';
  return ext ? `${base}${ext}` : base;
}

/** Extract clean extension from filename, e.g. ".pdf" */
function getExt(fileName?: string, mime?: string): string {
  if (fileName) {
    const dot = fileName.lastIndexOf('.');
    if (dot !== -1) return fileName.slice(dot).toLowerCase();
  }
  return mime ? (MIME_TO_EXT[mime] ?? '') : '';
}

/** Map MIME / extension to display label and theme colors */
type FileTheme = { icon: string; label: string; bg: string; border: string; color: string };

function getFileTheme(mime?: string, ext?: string): FileTheme {
  const m = mime ?? '';
  const e = (ext ?? '').toLowerCase();
  if (m === 'application/pdf' || e === '.pdf')
    return { icon: '📄', label: 'PDF',  bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   color: '#f87171' };
  if (m.includes('word') || m.includes('document') || e === '.doc' || e === '.docx')
    return { icon: '📝', label: 'Word', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)',  color: '#60a5fa' };
  if (m.includes('excel') || m.includes('spreadsheet') || e === '.xls' || e === '.xlsx')
    return { icon: '📊', label: 'Excel',bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)',   color: '#4ade80' };
  if (m.includes('powerpoint') || m.includes('presentation') || e === '.ppt' || e === '.pptx')
    return { icon: '📊', label: 'PPT',  bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.3)',  color: '#fb923c' };
  if (m.startsWith('video/') || ['.mp4','.webm','.mkv','.mov'].includes(e))
    return { icon: '🎬', label: 'Video',bg: 'rgba(168,85,247,0.12)',  border: 'rgba(168,85,247,0.3)',  color: '#c084fc' };
  if (m.startsWith('audio/') || ['.mp3','.wav','.ogg','.flac'].includes(e))
    return { icon: '🎵', label: 'Audio',bg: 'rgba(236,72,153,0.12)',  border: 'rgba(236,72,153,0.3)',  color: '#f472b6' };
  if (m.includes('zip') || m.includes('rar') || m.includes('7z') || ['.zip','.rar','.7z'].includes(e))
    return { icon: '🗜️', label: 'Archive',bg:'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)',   color: '#facc15' };
  if (m === 'text/plain' || e === '.txt')
    return { icon: '📃', label: 'Text', bg: 'rgba(148,163,184,0.1)',  border: 'rgba(148,163,184,0.25)',color: '#94a3b8' };
  if (m === 'text/csv' || e === '.csv')
    return { icon: '📋', label: 'CSV',  bg: 'rgba(20,184,166,0.12)',  border: 'rgba(20,184,166,0.3)',  color: '#2dd4bf' };
  if (m === 'application/json' || e === '.json')
    return { icon: '🔧', label: 'JSON', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  color: '#fbbf24' };
  return   { icon: '📎', label: 'File', bg: 'rgba(99,102,241,0.10)',  border: 'rgba(99,102,241,0.25)', color: '#818cf8' };
}

/** Trigger a file download via blob fetch so cross-origin files (S3/CDN)
 *  are saved with the correct filename and extension rather than opening in a new tab. */
async function triggerDownload(url: string, fileName: string, mimeType?: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();
    const resolvedMime = mimeType || blob.type || undefined;
    const safeFileName = ensureExtension(fileName, resolvedMime);
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = safeFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export default function ContentCard({ item, viewMode, onView }: ContentCardProps) {
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);

  const { mutate: deleteItem, isPending: deleting } = useMutation({
    mutationFn: () => contentService.delete(item._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Removed from vault');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const { mutate: togglePin } = useMutation({
    mutationFn: () => contentService.update(item._id, { isPinned: !item.isPinned }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['content'] }),
  });

  const typeColorClass = getContentTypeColor(item.type);
  const isListMode = viewMode === 'list';
  const hasFile = !!item.fileUrl;

  const displayTitle =
    item.title ||
    item.metadata?.title ||
    (item.fileName && (item.type === 'image' || item.type === 'file')
      ? item.fileName.includes('.')
        ? item.fileName.slice(0, item.fileName.lastIndexOf('.'))
        : item.fileName
      : null);

  /**
   * Resolve a presigned URL for any card that has a private S3 file.
   * Used for: image preview src + download button href.
   */
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const s3KeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!item.fileUrl) return;
    let cancelled = false;

    // Extract S3 key from stored URL
    let key: string | null = null;
    try {
      const parsed = new URL(item.fileUrl);
      if (parsed.hostname.includes('amazonaws.com')) {
        key = parsed.pathname.replace(/^\//, '');
      }
    } catch { /* ignore */ }

    s3KeyRef.current = key;

    if (!key) {
      setSignedUrl(item.fileUrl); // not an S3 URL, use as-is
      return;
    }

    contentService.getSignedUrl(key)
      .then(url => { if (!cancelled) setSignedUrl(url); })
      .catch(() => { if (!cancelled) setSignedUrl(item.fileUrl ?? null); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item._id]);

  /** Called when an <img> fails to load — silently re-fetches the presigned URL (e.g. it expired). */
  const handleImgError = () => {
    const key = s3KeyRef.current;
    if (!key) return;
    contentService.getSignedUrl(key)
      .then(url => setSignedUrl(url))
      .catch(() => { /* leave existing broken URL */ });
  };

  return (
    <>
      <article
        className={`glass-card-hover group relative overflow-hidden cursor-pointer ${isListMode ? 'flex gap-4' : 'flex flex-col h-full'}`}
        style={{ padding: isListMode ? '12px 16px' : '16px' }}
        onClick={() => onView(item)}
        title="Click to view"
      >

        {/* Pin indicator */}
        {item.isPinned && (
          <div className="absolute top-2 right-2 text-yellow-400 text-xs" title="Pinned">📌</div>
        )}

        {/* Image header — fixed height so card stays uniform */}
        {item.type === 'image' && !isListMode && (
          <div className="mb-3 -mx-4 -mt-4 overflow-hidden rounded-t-xl relative" style={{ height: '120px', flexShrink: 0 }}>
            {signedUrl ? (
              <img
                src={signedUrl}
                alt={item.fileName || 'Image'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                onError={handleImgError}
              />
            ) : (
              /* Shimmer while presigned URL loads */
              <div className="w-full h-full skeleton" />
            )}
          </div>
        )}

        {/* File header — same shape as image header, filled with file-type color + big icon */}
        {item.type === 'file' && !isListMode && (() => {
          const ext   = getExt(item.fileName, item.fileMimeType);
          const theme = getFileTheme(item.fileMimeType, ext);
          return (
            <div
              className="mb-3 -mx-4 -mt-4 overflow-hidden rounded-t-xl flex items-center justify-center relative"
              style={{
                height: '120px',
                flexShrink: 0,
                background: `linear-gradient(135deg, ${theme.bg} 0%, rgba(15,23,42,0.6) 100%)`,
                borderBottom: `1px solid ${theme.border}`,
              }}
            >
              {/* Subtle glow behind icon */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ filter: 'blur(28px)', opacity: 0.35 }}
              >
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: theme.color }} />
              </div>
              {/* Icon */}
              <span
                className="relative z-10 select-none transition-transform duration-300 group-hover:scale-110"
                style={{ fontSize: 52, lineHeight: 1, filter: `drop-shadow(0 0 12px ${theme.color}88)` }}
              >
                {theme.icon}
              </span>
            </div>
          );
        })()}

        {/* Link image header */}
        {item.type === 'link' && item.metadata?.image && !isListMode && (
          <div className="mb-3 -mx-4 -mt-4 overflow-hidden rounded-t-xl" style={{ height: '100px', flexShrink: 0 }}>
            <img src={item.metadata.image} alt={item.metadata.title || ''} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy"
                 onError={(e) => (e.currentTarget.parentElement!.style.display = 'none')} />
          </div>
        )}

        {/* List mode icon */}
        {isListMode && (
          <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-lg"
               style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {getContentTypeIcon(item.type)}
          </div>
        )}

        <div className={`flex-1 min-w-0 ${isListMode ? '' : 'flex flex-col'}`}>
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              {/* Type badge */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border mb-1 ${typeColorClass}`}>
                {!isListMode && getContentTypeIcon(item.type)} {item.type}
              </span>

              {/* Title — falls back to original filename (no extension) for image/file */}
              {displayTitle ? (
                <h3
                  className={`font-semibold text-slate-100 truncate ${isListMode ? 'text-sm' : 'text-sm mt-1'}`}
                  title={displayTitle}
                >
                  {displayTitle}
                </h3>
              ) : null}
            </div>

            {/* Actions (visible on hover) */}
            <div
              className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              onClick={(e) => e.stopPropagation()} // prevent card click from firing
            >
              {/* Download button — uses presigned URL with Content-Disposition attachment */}
              {hasFile && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!signedUrl || !item.fileUrl) return;
                    
                    let key: string | null = null;
                    try {
                      const parsed = new URL(item.fileUrl);
                      if (parsed.hostname.includes('amazonaws.com')) {
                        key = parsed.pathname.replace(/^\//, '');
                      }
                    } catch { /* ignore */ }

                    if (key) {
                      const safeName = ensureExtension(displayTitle || item.fileName || 'download', item.fileMimeType);
                      try {
                        const dUrl = await contentService.getSignedUrl(key, safeName);
                        window.location.assign(dUrl);
                        return;
                      } catch { /* fallback to blob below */ }
                    }
                    void triggerDownload(signedUrl, displayTitle || item.fileName || 'download', item.fileMimeType);
                  }}
                  disabled={!signedUrl}
                  title={signedUrl ? 'Download' : 'Preparing…'}
                  className="btn-ghost !px-1.5 !py-1 !text-xs"
                  style={{ minWidth: 'auto', opacity: signedUrl ? 1 : 0.4 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              )}
              <button onClick={() => togglePin()} title={item.isPinned ? 'Unpin' : 'Pin'}
                      className="btn-ghost !px-1.5 !py-1 !text-xs" style={{ minWidth: 'auto' }}>
                {item.isPinned ? '📌' : '📍'}
              </button>
              <button onClick={() => setShowEdit(true)} className="btn-ghost !px-1.5 !py-1 !text-xs" title="Edit">
                ✏️
              </button>
              <button onClick={() => deleteItem()} disabled={deleting} className="btn-danger !px-1.5 !py-1 !text-xs" title="Delete">
                🗑️
              </button>
            </div>
          </div>

          {/* Content body */}
          {item.type === 'text' && item.content && (
            <p className={`text-slate-300 text-xs leading-relaxed ${isListMode ? 'line-clamp-1' : 'line-clamp-4 flex-1'}`}>
              {item.content}
            </p>
          )}

          {item.type === 'link' && (
            <span className="group/link flex items-center gap-2">
              {item.metadata?.favicon && (
                <img src={item.metadata.favicon} alt="" className="w-4 h-4 flex-shrink-0" onError={(e) => (e.currentTarget.style.display = 'none')} />
              )}
              <span className={`text-primary-400 text-xs truncate ${isListMode ? '' : 'block'}`}>
                {item.metadata?.domain || item.content}
              </span>
              {item.metadata?.description && !isListMode && (
                <p className="text-slate-400 text-xs line-clamp-2 mt-1">{item.metadata.description}</p>
              )}
            </span>
          )}

          {/* File body — compact filename + meta row (header banner is above the card body) */}
          {item.type === 'file' && !isListMode && (() => {
            const ext   = getExt(item.fileName, item.fileMimeType);
            const theme = getFileTheme(item.fileMimeType, ext);
            const name  = item.fileName || 'Unknown file';
            const baseName = name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : name;
            return (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="min-w-0 flex-1">
                  <p className="text-slate-100 text-xs font-semibold truncate" title={name}>{baseName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {ext && (
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: theme.border, color: theme.color }}
                      >
                        {ext.replace('.', '')}
                      </span>
                    )}
                    {item.fileSize && (
                      <span className="text-[10px] text-slate-500">{formatFileSize(item.fileSize)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* List mode: compact file row */}
          {item.type === 'file' && isListMode && (() => {
            const ext   = getExt(item.fileName, item.fileMimeType);
            const theme = getFileTheme(item.fileMimeType, ext);
            return (
              <div className="flex items-center gap-2 text-slate-300">
                <span style={{ fontSize: 16 }}>{theme.icon}</span>
                <span className="text-xs truncate flex-1">{item.fileName || 'Unknown file'}</span>
                {ext && (
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ background: theme.border, color: theme.color }}>
                    {ext.replace('.', '')}
                  </span>
                )}
                {item.fileSize && (
                  <span className="text-[10px] text-slate-500 flex-shrink-0">{formatFileSize(item.fileSize)}</span>
                )}
              </div>
            );
          })()}

          {/* Tags and date */}
          <div className={`flex items-center justify-between gap-2 mt-3 ${isListMode ? 'ml-auto' : 'mt-auto pt-3'}`}>
            <div className="flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="tag-badge !py-0 !text-[10px]">#{tag}</span>
              ))}
              {item.tags.length > 3 && (
                <span className="text-slate-500 text-[10px]">+{item.tags.length - 3}</span>
              )}
            </div>
            <span className="text-slate-500 text-[10px] flex-shrink-0">{formatDate(item.createdAt)}</span>
          </div>
        </div>
      </article>

      {showEdit && <EditModal item={item} onClose={() => setShowEdit(false)} />}
    </>
  );
}
