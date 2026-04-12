import React, { useEffect, useCallback, useState, useRef } from 'react';
import { Content } from '../../types';
import { formatFileSize, formatDate } from '../../utils/contentDetector';
import { contentService } from '../../services/content.service';

interface ContentViewModalProps {
  item: Content;
  onClose: () => void;
}

/* ─── MIME helpers ───────────────────────────────────────────────── */
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
  'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/bmp': '.bmp',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/zip': '.zip', 'application/x-rar-compressed': '.rar',
  'application/x-7z-compressed': '.7z', 'text/plain': '.txt',
  'text/csv': '.csv', 'text/html': '.html', 'application/json': '.json',
  'video/mp4': '.mp4', 'video/webm': '.webm', 'video/x-matroska': '.mkv',
  'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'audio/ogg': '.ogg',
};

const EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip', '.rar': 'application/x-rar-compressed',
  '.7z': 'application/x-7z-compressed', '.txt': 'text/plain',
  '.csv': 'text/csv', '.json': 'application/json',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
};

/** Extract extension from a filename or URL path */
function getExtFromPath(path: string): string {
  const name = path.split('?')[0].split('/').pop() ?? '';
  const dot = name.lastIndexOf('.');
  return dot !== -1 ? name.slice(dot).toLowerCase() : '';
}

/** Detect MIME from filename / URL extension */
function mimeFromExt(ext: string): string | undefined {
  return EXT_TO_MIME[ext] ?? undefined;
}

function ensureExtension(fileName: string, mimeType?: string): string {
  const base = fileName.split('/').pop() ?? fileName;
  if (base.includes('.')) return base;
  const ext = mimeType ? (MIME_TO_EXT[mimeType] ?? '') : '';
  return ext ? `${base}${ext}` : base;
}

/**
 * Resolve the best MIME type we have for a file:
 *  1. stored fileMimeType
 *  2. inferred from stored fileName extension
 *  3. inferred from file URL extension
 */
function resolveMime(item: Content): string | undefined {
  if (item.fileMimeType) return item.fileMimeType;
  if (item.fileName) {
    const ext = getExtFromPath(item.fileName);
    const m = mimeFromExt(ext);
    if (m) return m;
  }
  if (item.fileUrl) {
    const ext = getExtFromPath(item.fileUrl);
    const m = mimeFromExt(ext);
    if (m) return m;
  }
  return undefined;
}

/**
 * Best display name for a file, matches the visual title logic exactly.
 */
function resolveFileName(item: Content): string {
  if (item.title) return item.title;
  if (item.metadata?.title) return item.metadata.title;
  if (item.fileName) {
    if (item.type === 'image' || item.type === 'file') {
      return item.fileName.includes('.')
        ? item.fileName.slice(0, item.fileName.lastIndexOf('.'))
        : item.fileName;
    }
    return item.fileName;
  }
  if (item.fileUrl) {
    const seg = item.fileUrl.split('?')[0].split('/').pop();
    if (seg) return seg;
  }
  return 'download';
}

/**
 * Download: HEAD-request first to sniff Content-Type from the server,
 * then full GET for the blob. Saves with correct extension.
 */
async function downloadFile(url: string, fileName: string, mimeHint?: string) {
  try {
    // Try HEAD first to get real Content-Type
    let serverMime: string | undefined;
    try {
      const head = await fetch(url, { method: 'HEAD' });
      const ct = head.headers.get('Content-Type');
      if (ct && ct !== 'application/octet-stream') serverMime = ct.split(';')[0].trim();
    } catch { /* ignore — proceed with GET */ }

    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();

    // Pick best mime: hint > HEAD response > GET blob.type (skip octet-stream as last resort)
    const blobMime = blob.type !== 'application/octet-stream' ? blob.type : undefined;
    const resolvedMime = mimeHint || serverMime || blobMime || undefined;

    // Also try to infer from the URL extension first if all else fails
    const urlExt = getExtFromPath(url);
    const fallbackMime = resolvedMime || mimeFromExt(urlExt);

    const safeFileName = ensureExtension(fileName, fallbackMime);

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

/* ─── Type guards ────────────────────────────────────────────────── */
const isPdf   = (m?: string) => m === 'application/pdf';
const isVideo = (m?: string) => !!m?.startsWith('video/');
const isAudio = (m?: string) => !!m?.startsWith('audio/');

const isOfficeFile = (m?: string) =>
  m === 'application/msword' ||
  m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
  m === 'application/vnd.ms-excel' ||
  m === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
  m === 'application/vnd.ms-powerpoint' ||
  m === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

/** Microsoft Office Online viewer — works for .doc/.docx/.xls/.xlsx/.ppt/.pptx */
function officeViewerUrl(fileUrl: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

/**
 * Append the correct extension to an S3/CDN URL so Office Online /
 * PDF viewers can identify the file type. S3 raw files support
 * extension-suffixed URLs.
 */
function withExtension(url: string, mime: string): string {
  const ext = MIME_TO_EXT[mime];
  if (!ext) return url;
  const [base, query] = url.split('?');
  const lastSegment = base.split('/').pop() ?? '';
  if (lastSegment.includes('.')) return url; // already has an extension
  return query ? `${base}${ext}?${query}` : `${base}${ext}`;
}

/* ─── FileIcon ───────────────────────────────────────────────────── */
function FileIcon({ mime }: { mime?: string }) {
  if (isPdf(mime))           return <span style={{ fontSize: 56 }}>📄</span>;
  if (isVideo(mime))         return <span style={{ fontSize: 56 }}>🎬</span>;
  if (isAudio(mime))         return <span style={{ fontSize: 56 }}>🎵</span>;
  if (mime?.startsWith('image/')) return <span style={{ fontSize: 56 }}>🖼️</span>;
  if (mime?.includes('zip') || mime?.includes('rar') || mime?.includes('7z'))
    return                         <span style={{ fontSize: 56 }}>🗜️</span>;
  if (mime?.includes('word') || mime?.includes('document'))
    return                         <span style={{ fontSize: 56 }}>📝</span>;
  if (mime?.includes('excel') || mime?.includes('spreadsheet'))
    return                         <span style={{ fontSize: 56 }}>📊</span>;
  if (mime?.includes('powerpoint') || mime?.includes('presentation'))
    return                         <span style={{ fontSize: 56 }}>📊</span>;
  return                           <span style={{ fontSize: 56 }}>📎</span>;
}

/* ════════════════════════════════════════════════════════════════════
   Main modal
════════════════════════════════════════════════════════════════════ */
export default function ContentViewModal({ item, onClose }: ContentViewModalProps) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError,   setIframeError]   = useState(false);
  const [imgLoaded,     setImgLoaded]     = useState(false);
  const [downloading,   setDownloading]   = useState(false);
  /** MIME sniffed from a HEAD request (for old uploads with no stored type) */
  const [sniffedMime,   setSniffedMime]   = useState<string | undefined>(undefined);
  const [sniffing,      setSniffing]      = useState(false);

  /**
   * Presigned URL state — resolved once per modal open.
   * The bucket is private; we must never use the raw S3 URL directly.
   */
  const [resolvedUrl,  setResolvedUrl]   = useState<string | null>(null);
  const [urlLoading,   setUrlLoading]    = useState(false);
  const s3KeyRef = useRef<string | null>(null);

  /** Silently re-fetches a fresh presigned URL (called when image/video reports load error). */
  const refreshSignedUrl = useCallback(() => {
    const key = s3KeyRef.current;
    if (!key) return;
    contentService.getSignedUrl(key)
      .then(url => setResolvedUrl(url))
      .catch(() => { /* leave existing URL */ });
  }, []);

  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [handleKey]);

  /**
   * Fetch a presigned URL from the backend whenever a file item is opened.
   * The key is extracted from the stored S3 URL.
   */
  useEffect(() => {
    if (!item.fileUrl) return;
    let cancelled = false;

    // Extract S3 key from the stored URL (path after the bucket hostname)
    let key: string | null = null;
    try {
      const parsed = new URL(item.fileUrl);
      if (parsed.hostname.includes('amazonaws.com')) {
        key = parsed.pathname.replace(/^\//, '');
      }
    } catch { /* ignore */ }

    s3KeyRef.current = key;

    if (!key) {
      // Not an S3 URL (e.g. external URL) — use as-is
      setResolvedUrl(item.fileUrl);
      return;
    }

    setUrlLoading(true);
    contentService.getSignedUrl(key)
      .then(url => { if (!cancelled) setResolvedUrl(url); })
      .catch(() => { if (!cancelled) setResolvedUrl(item.fileUrl ?? null); }) // fallback
      .finally(() => { if (!cancelled) setUrlLoading(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item._id]);

  /**
   * HEAD-request MIME sniffing: for files with no stored MIME type,
   * ask the S3 server for the Content-Type header (using the signed URL).
   */
  useEffect(() => {
    const storedMime = resolveMime(item);
    if (storedMime || !resolvedUrl || item.type !== 'file') return;
    let cancelled = false;
    setSniffing(true);
    fetch(resolvedUrl, { method: 'HEAD' })
      .then(res => {
        if (cancelled) return;
        const ct = res.headers.get('Content-Type');
        if (ct && ct !== 'application/octet-stream') {
          setSniffedMime(ct.split(';')[0].trim());
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSniffing(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item._id, resolvedUrl]);

  /* Resolve best-available MIME and filename.
   * Priority: stored fileMimeType > inferred from filename/URL > sniffed from HEAD request */
  const resolvedMime = resolveMime(item);
  const mime         = resolvedMime || sniffedMime;
  const fileName     = resolveFileName(item);
  const title        = item.title || item.metadata?.title || (item.fileName ?? null) || 'View Content';
  const hasFile      = !!item.fileUrl;

  const handleDownload = async () => {
    if (!item.fileUrl) return;
    setDownloading(true);

    let key: string | null = null;
    try {
      const parsed = new URL(item.fileUrl);
      if (parsed.hostname.includes('amazonaws.com')) {
        key = parsed.pathname.replace(/^\//, '');
      }
    } catch { /* ignore */ }

    if (key) {
      try {
        const safeName = ensureExtension(fileName, mime);
        const dUrl = await contentService.getSignedUrl(key, safeName);
        window.location.assign(dUrl);
      } catch {
        if (resolvedUrl) await downloadFile(resolvedUrl, fileName, mime);
      }
    } else if (resolvedUrl) {
      await downloadFile(resolvedUrl, fileName, mime);
    }
    
    setDownloading(false);
  };

  /* Panel sizing */
  const isWide = item.type === 'image' || (
    item.type === 'file' && (isPdf(mime) || isOfficeFile(mime) || isVideo(mime))
  );
  const panelW = isWide ? 'min(94vw, 1100px)' : 'min(94vw, 720px)';

  /* Which viewer to render — only attempt when presigned URL is ready and MIME is confirmed */
  const fileReady        = !!resolvedUrl && !urlLoading;
  const showPdfViewer    = item.type === 'file' && isPdf(mime) && fileReady;
  const showOfficeViewer = item.type === 'file' && isOfficeFile(mime) && fileReady;
  const showVideo        = item.type === 'file' && isVideo(mime) && fileReady;
  const showAudio        = item.type === 'file' && isAudio(mime) && fileReady;
  // Show download card: non-previewable type, or MIME still unknown after sniffing
  const showGenericCard  = item.type === 'file' && !showPdfViewer && !showOfficeViewer && !showVideo && !showAudio && !sniffing && !urlLoading;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ padding: '16px' }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative z-10 flex flex-col animate-slide-up"
        style={{
          width: panelW,
          height: '92vh',
          background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(23,37,65,0.98) 100%)',
          border: '1px solid rgba(148,163,184,0.12)',
          borderRadius: '20px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
        >
          {/* Type pill */}
          <span
            className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full flex-shrink-0"
            style={{
              background: item.type === 'image' ? 'rgba(34,197,94,0.15)' :
                          item.type === 'file'  ? 'rgba(251,146,60,0.15)' :
                          item.type === 'link'  ? 'rgba(59,130,246,0.15)' : 'rgba(168,85,247,0.15)',
              color: item.type === 'image' ? '#4ade80' :
                     item.type === 'file'  ? '#fb923c' :
                     item.type === 'link'  ? '#60a5fa' : '#c084fc',
            }}
          >
            {item.type}
          </span>

          <h2 className="flex-1 min-w-0 text-sm font-semibold text-slate-100 truncate" title={title}>
            {title}
          </h2>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Download */}
            {hasFile && (
              <button
                id="view-download-btn"
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: downloading ? '#64748b' : '#94a3b8',
                  cursor: downloading ? 'not-allowed' : 'pointer',
                }}
              >
                {downloading ? (
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                )}
                {downloading ? 'Preparing…' : 'Download'}
              </button>
            )}

            {/* Open link */}
            {item.type === 'link' && item.content && (
              <a
                href={item.content}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.35)', color: '#a5b4fc' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Open Link
              </a>
            )}

            {/* Close */}
            <button
              id="view-close-btn"
              onClick={onClose}
              title="Close (Esc)"
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.15)'; (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>

          {/* ─ Loading presigned URL ─ */}
          {urlLoading && item.fileUrl && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4" style={{ background: '#0f172a' }}>
              <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <p className="text-slate-400 text-sm">Preparing secure file access…</p>
            </div>
          )}

          {/* ─ IMAGE ─ */}
          {item.type === 'image' && resolvedUrl && !urlLoading && (
            <div
              className="w-full h-full flex items-center justify-center relative"
              style={{ background: 'radial-gradient(ellipse at center, rgba(30,41,59,0.8) 0%, rgba(8,12,20,1) 100%)' }}
            >
              {!imgLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                </div>
              )}
              <img
                src={resolvedUrl}
                alt={fileName}
                onLoad={() => setImgLoaded(true)}
                onError={refreshSignedUrl}
                style={{
                  maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                  borderRadius: '8px', boxShadow: '0 4px 60px rgba(0,0,0,0.8)',
                  opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s ease', padding: '16px',
                }}
              />
            </div>
          )}

          {/* ─ Sniffing MIME via HEAD request — show spinner while waiting ─ */}
          {sniffing && item.type === 'file' && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4" style={{ background: '#0f172a' }}>
              <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <p className="text-slate-400 text-sm">Detecting file type…</p>
              <p className="text-slate-600 text-xs">Checking file headers</p>
            </div>
          )}

          {/* ─ FILE: PDF — native browser viewer ─ */}
          {showPdfViewer && !iframeError && (
            <div className="relative w-full h-full" style={{ background: '#1e293b' }}>
              {iframeLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
                  <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                  <p className="text-slate-400 text-sm">Loading PDF…</p>
                </div>
              )}
              <iframe
                src={mime ? withExtension(resolvedUrl!, mime) + '#toolbar=1&navpanes=0' : `${resolvedUrl}#toolbar=1&navpanes=0`}
                title={fileName}
                className="w-full h-full border-0"
                style={{ opacity: iframeLoading ? 0 : 1, transition: 'opacity 0.4s ease' }}
                onLoad={() => setIframeLoading(false)}
                onError={() => { setIframeLoading(false); setIframeError(true); }}
              />
            </div>
          )}

          {/* ─ FILE: Office docs — Microsoft Office Online Viewer ─ */}
          {showOfficeViewer && !iframeError && (
            <div className="relative w-full h-full" style={{ background: '#0f172a' }}>
              {iframeLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
                  <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                  <p className="text-slate-400 text-sm">Loading document…</p>
                  <p className="text-slate-600 text-xs">Powered by Microsoft Office Online</p>
                </div>
              )}
              {/* Pass URL with extension appended — Office Online requires a URL ending in .docx/.xlsx etc. */}
              <iframe
                src={officeViewerUrl(withExtension(resolvedUrl!, mime!))}
                title={fileName}
                className="w-full h-full border-0"
                style={{ opacity: iframeLoading ? 0 : 1, transition: 'opacity 0.4s ease' }}
                onLoad={() => setIframeLoading(false)}
                onError={() => { setIframeLoading(false); setIframeError(true); }}
              />
            </div>
          )}

          {/* ─ Viewer failed / generic non-previewable file ─ */}
          {((showPdfViewer || showOfficeViewer) && iframeError) || showGenericCard ? (
            <GenericFileCard
              item={item}
              fileName={fileName}
              mime={mime}
              iframeError={(showPdfViewer || showOfficeViewer) && iframeError}
              onDownload={handleDownload}
              downloading={downloading}
              resolvedUrl={resolvedUrl}
            />
          ) : null}


          {/* ─ FILE: Video ─ */}
          {showVideo && (
            <div className="w-full h-full flex items-center justify-center p-4" style={{ background: '#000' }}>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video controls style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '12px' }}>
                <source src={resolvedUrl!} type={mime} />
              </video>
            </div>
          )}

          {/* ─ FILE: Audio ─ */}
          {showAudio && (
            <div className="flex flex-col items-center justify-center gap-8 p-12 h-full">
              <div
                className="w-32 h-32 rounded-3xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(168,85,247,0.2))', border: '1px solid rgba(99,102,241,0.3)' }}
              >
                <span style={{ fontSize: 56 }}>🎵</span>
              </div>
              <div className="text-center">
                <p className="text-slate-200 font-semibold text-base mb-1">{fileName}</p>
                {item.fileSize && <p className="text-slate-500 text-sm">{formatFileSize(item.fileSize)}</p>}
              </div>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio controls style={{ width: '100%', maxWidth: '440px' }}>
                <source src={resolvedUrl!} type={mime} />
              </audio>
            </div>
          )}

          {/* ─ FILE: Known non-previewable type ─ */}
          {showGenericCard && (
            <GenericFileCard
              item={item}
              fileName={fileName}
              mime={mime}
              onDownload={handleDownload}
              downloading={downloading}
              resolvedUrl={resolvedUrl}
            />
          )}

          {/* ─ TEXT ─ */}
          {item.type === 'text' && (
            <div className="p-6 h-full overflow-auto">
              <pre
                className="text-slate-200 text-sm leading-loose whitespace-pre-wrap font-sans"
                style={{
                  wordBreak: 'break-word',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px', padding: '20px', minHeight: '100%',
                }}
              >
                {item.content || '(empty note)'}
              </pre>
            </div>
          )}

          {/* ─ LINK ─ */}
          {item.type === 'link' && (
            <div className="p-6 overflow-auto h-full">
              {item.metadata?.image && (
                <div className="w-full rounded-2xl overflow-hidden mb-6" style={{ maxHeight: '280px' }}>
                  <img
                    src={item.metadata.image} alt={item.metadata.title || ''}
                    className="w-full h-full object-cover"
                    onError={e => (e.currentTarget.parentElement!.style.display = 'none')}
                  />
                </div>
              )}
              <div className="flex items-center gap-2.5 mb-4">
                {item.metadata?.favicon && (
                  <img src={item.metadata.favicon} alt="" className="w-5 h-5 rounded"
                    onError={e => (e.currentTarget.style.display = 'none')} />
                )}
                <span className="text-indigo-400 text-sm font-medium">
                  {item.metadata?.domain ?? (() => { try { return new URL(item.content ?? '').hostname; } catch { return item.content; } })()}
                </span>
              </div>
              {item.metadata?.title && (
                <h3 className="text-slate-100 font-bold text-xl mb-3 leading-snug">{item.metadata.title}</h3>
              )}
              {item.metadata?.description && (
                <p className="text-slate-400 text-sm leading-relaxed mb-5">{item.metadata.description}</p>
              )}
              <div className="font-mono text-xs text-slate-500 truncate px-4 py-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {item.content}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-between px-5 py-2.5 flex-shrink-0 text-xs text-slate-500"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex gap-1.5 flex-wrap">
            {item.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                #{tag}
              </span>
            ))}
          </div>
          <span className="flex-shrink-0 ml-3">{formatDate(item.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Generic file card (non-previewable) ─────────────────────────── */
function GenericFileCard({
  item, fileName, mime, iframeError, onDownload, downloading, resolvedUrl,
}: {
  item: Content;
  fileName: string;
  mime?: string;
  iframeError?: boolean;
  onDownload: () => void;
  downloading: boolean;
  resolvedUrl?: string | null;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-12 h-full text-center">
      <div
        className="w-32 h-32 rounded-3xl flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg,rgba(251,146,60,0.12),rgba(249,115,22,0.08))',
          border: '1px solid rgba(251,146,60,0.25)',
          boxShadow: '0 0 60px rgba(251,146,60,0.08)',
        }}
      >
        <FileIcon mime={mime} />
      </div>

      <div>
        <p className="text-slate-100 font-semibold text-lg mb-1">{fileName}</p>
        <p className="text-slate-500 text-sm">
          {mime ?? 'File type unknown'}
          {item.fileSize ? ` · ${formatFileSize(item.fileSize)}` : ''}
        </p>
        {!mime && (
          <p className="text-amber-400/70 text-xs mt-2">
            This file was uploaded before type detection was added.<br />
            Download it to open, or delete and re-upload for inline preview.
          </p>
        )}
        {iframeError && mime && (
          <p className="text-amber-400/70 text-xs mt-2">Preview unavailable for this file type — please download to view</p>
        )}
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          id="view-download-file-btn"
          onClick={onDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-200"
          style={{
            background: downloading
              ? 'rgba(99,102,241,0.4)'
              : 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)',
            color: '#fff',
            boxShadow: downloading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
            cursor: downloading ? 'not-allowed' : 'pointer',
          }}
        >
          {downloading ? (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          )}
          {downloading ? 'Preparing download…' : 'Download File'}
        </button>
        {resolvedUrl && (
          <a href={resolvedUrl} target="_blank" rel="noopener noreferrer"
            className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
            Open in browser ↗
          </a>
        )}
      </div>
    </div>
  );
}
