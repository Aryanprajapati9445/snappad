import React, { useState, useRef, DragEvent } from 'react';
import { api } from '../lib/api';
import { CreateContentPayload, UploadResult } from '../lib/types';

type ContentType = 'link' | 'text' | 'image' | 'file';

function detectType(value: string): 'link' | 'text' {
  try { new URL(value); return 'link'; } catch { return 'text'; }
}

function fileContentType(file: File): 'image' | 'file' {
  return file.type.startsWith('image/') ? 'image' : 'file';
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function QuickSave() {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stage a file (from drop or picker)
  const stageFile = (file: File) => {
    setStagedFile(file);
    setContent('');
    setTitle('');
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const clearFile = () => {
    setStagedFile(null);
    setFilePreview(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // On-demand: fetch current tab URL + title
  const fillCurrentTab = () => {
    setFetching(true);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('about:')) {
        setContent(tab.url);
        setTitle(tab.title ?? '');
        clearFile();
      }
      setFetching(false);
    });
  };

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    // Only clear if leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
  };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) stageFile(file);
  };

  const detectedType: ContentType = stagedFile
    ? fileContentType(stagedFile)
    : detectType(content.trim());

  const addTag = (raw: string) => {
    const clean = raw.trim().replace(/^#/, '').toLowerCase();
    if (clean && !tags.includes(clean)) setTags((p) => [...p, clean]);
    setTagInput('');
  };
  const removeTag = (tag: string) => setTags((p) => p.filter((t) => t !== tag));
  const handleTagKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
    if (e.key === 'Backspace' && !tagInput && tags.length) removeTag(tags[tags.length - 1]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      let payload: CreateContentPayload;

      if (stagedFile) {
        // Upload the file first
        const formData = new FormData();
        formData.append('file', stagedFile);
        const uploadRes = await api.post<UploadResult>('/upload', formData);
        const upload = uploadRes.data!;
        payload = {
          type: fileContentType(stagedFile),
          fileUrl: upload.url,
          fileName: stagedFile.name,
          fileSize: stagedFile.size,
          fileMimeType: stagedFile.type,
          tags,
        };
      } else {
        const trimmed = content.trim();
        if (!trimmed) return;
        payload = {
          type: detectType(trimmed),
          content: trimmed,
          tags,
        };
        if (title.trim()) payload.title = title.trim();
      }

      await api.post('/content', payload);
      setSuccess(true);
      setContent('');
      setTitle('');
      setTags([]);
      clearFile();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const typeColors: Record<ContentType, string> = {
    link: 'type-link', text: 'type-text', image: 'type-image', file: 'type-file',
  };
  const typeLabels: Record<ContentType, string> = {
    link: '🔗 Link', text: '📝 Note', image: '🖼️ Image', file: '📎 File',
  };

  const canSubmit = (!!content.trim() || !!stagedFile) && !loading;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {success && <div className="alert alert-success">✅ Saved to your Snappad!</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Drop zone — wraps the text input area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          position: 'relative',
          borderRadius: '8px',
          border: dragOver
            ? '2px dashed rgba(99,102,241,0.7)'
            : '2px dashed transparent',
          background: dragOver ? 'rgba(99,102,241,0.07)' : 'transparent',
          transition: 'all 0.15s',
          padding: '2px',
        }}
      >
        {dragOver && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(15,23,42,0.7)', borderRadius: '8px',
            color: '#a5b4fc', fontWeight: 600, fontSize: '13px', gap: '6px',
            pointerEvents: 'none',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Drop file here
          </div>
        )}

        {/* Staged file preview */}
        {stagedFile ? (
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
            {filePreview && (
              <img src={filePreview} alt="preview"
                style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', display: 'block' }} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px' }}>
              <span style={{ fontSize: '20px' }}>
                {stagedFile.type.startsWith('image/') ? '🖼️' : '📎'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {stagedFile.name}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {formatSize(stagedFile.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={clearFile}
                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
                title="Remove file"
              >×</button>
            </div>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div style={{ height: '2px', background: 'var(--border)' }}>
                <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'var(--primary)', transition: 'width 0.2s' }} />
              </div>
            )}
          </div>
        ) : (
          /* Text / URL input */
          <div className="form-group" style={{ margin: 0 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '5px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                {detectType(content.trim()) === 'link' && content ? 'URL' : 'Content'}
              </label>
              <button
                type="button"
                onClick={fillCurrentTab}
                disabled={fetching}
                title="Import current tab URL & title"
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '2px 8px',
                  background: 'rgba(99,102,241,0.12)',
                  border: '1px solid rgba(99,102,241,0.25)',
                  borderRadius: '5px',
                  color: '#a5b4fc', fontSize: '11px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.22)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.12)')}
              >
                {fetching
                  ? <span className="spinner" style={{ width: '10px', height: '10px', borderWidth: '1.5px' }} />
                  : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="M2 9h20"/><path d="M7 4v5"/>
                    </svg>
                }
                Import tab
              </button>
            </div>
            <textarea
              className="form-input"
              placeholder="Paste a URL or type a note... or drop a file above"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              style={{ minHeight: '68px' }}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Type badge + file attach button row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(content || stagedFile) && (
            <span className={`type-badge ${typeColors[detectedType]}`}>
              {typeLabels[detectedType]}
            </span>
          )}
          {!stagedFile && content && detectedType === 'link' && (
            <span className="text-xs text-muted truncate" style={{ maxWidth: '160px' }}>
              {(() => { try { return new URL(content).hostname; } catch { return ''; } })()}
            </span>
          )}
        </div>

        {/* File / image attach button */}
        {!stagedFile && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach a file or image"
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '2px 8px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)',
              borderRadius: '5px',
              color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
            </svg>
            Attach
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && stageFile(e.target.files[0])}
        />
      </div>

      {/* Title (for links) */}
      {!stagedFile && detectType(content.trim()) === 'link' && content && (
        <div className="form-group">
          <label className="form-label">Title (optional)</label>
          <input
            type="text"
            className="form-input"
            placeholder="Page title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      )}

      {/* Tags */}
      <div className="form-group">
        <label className="form-label">Tags</label>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '4px',
          padding: '6px 10px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          minHeight: '36px', alignItems: 'center',
        }}>
          {tags.map((tag) => (
            <span key={tag} className="tag-badge">
              #{tag}
              <button type="button" onClick={() => removeTag(tag)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0 0 0 2px', lineHeight: 1 }}>
                ×
              </button>
            </span>
          ))}
          <input
            className="form-input"
            style={{ padding: '0', border: 'none', background: 'none', minWidth: '60px', flex: 1, fontSize: '12px' }}
            placeholder="+ tag"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKey}
            onBlur={() => tagInput && addTag(tagInput)}
          />
        </div>
      </div>

      <button type="submit" className="btn btn-primary btn-full" disabled={!canSubmit}>
        {loading ? <span className="spinner" /> : '💾 Save to Vault'}
      </button>
    </form>
  );
}
