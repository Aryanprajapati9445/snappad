import React, { useState, useRef, useCallback, DragEvent, ClipboardEvent, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { contentService } from '../../services/content.service';
import { detectContentType, extractHashtags, isUrl, formatFileSize } from '../../utils/contentDetector';
import { ContentType, ContentMetadata, UploadResult } from '../../types';

interface SmartInputProps {
  onSuccess?: () => void;
}

export default function SmartInput({ onSuccess }: SmartInputProps) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [detectedType, setDetectedType] = useState<ContentType>('text');
  const [dragOver, setDragOver] = useState(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [linkPreview, setLinkPreview] = useState<ContentMetadata | null>(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
    }
  }, [text]);

  // Auto-detect type and trigger URL preview
  useEffect(() => {
    if (stagedFile) return;
    const trimmed = text.trim();
    const type = detectContentType(trimmed);
    setDetectedType(type);

    if (type === 'link') {
      clearTimeout(previewTimerRef.current);
      setFetchingPreview(true);
      previewTimerRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ type: 'link', content: trimmed }),
          });
          if (res.ok) {
            const json = await res.json();
            setLinkPreview(json.data?.metadata || null);
          }
        } catch { /* ignore */ } finally {
          setFetchingPreview(false);
        }
      }, 800);
    } else {
      setLinkPreview(null);
      setFetchingPreview(false);
    }

    // Extract hashtags from text
    const extracted = extractHashtags(trimmed);
    if (extracted.length > 0) {
      setTags((prev) => [...new Set([...prev, ...extracted])]);
    }
  }, [text, stagedFile]);

  const { mutate: submitContent, isPending } = useMutation({
    mutationFn: async () => {
      if (stagedFile) {
        // Upload file first
        let upload: UploadResult;
        try {
          upload = await contentService.uploadFile(stagedFile, setUploadProgress);
        } catch {
          throw new Error('File upload failed');
        }
        return contentService.create({
          type: detectContentType(stagedFile),
          fileUrl: upload.url,
          fileName: stagedFile.name,
          fileSize: stagedFile.size,
          fileMimeType: stagedFile.type,
          tags,
          metadata: upload.resourceType === 'image' ? undefined : undefined,
        });
      }

      return contentService.create({
        type: detectedType,
        content: text.trim(),
        tags,
        metadata: linkPreview || undefined,
      });
    },
    onSuccess: () => {
      setText('');
      setTags([]);
      setStagedFile(null);
      setFilePreview(null);
      setLinkPreview(null);
      setUploadProgress(0);
      queryClient.invalidateQueries({ queryKey: ['content'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Saved to vault!');
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to save');
    },
  });

  const handleFile = useCallback((file: File) => {
    setStagedFile(file);
    setDetectedType(detectContentType(file));
    setText('');
    setLinkPreview(null);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handlePaste = useCallback((e: ClipboardEvent<HTMLTextAreaElement>) => {
    const file = e.clipboardData.files[0];
    if (file) {
      e.preventDefault();
      handleFile(file);
    }
  }, [handleFile]);

  const addTag = (tag: string) => {
    const clean = tag.trim().replace(/^#/, '').toLowerCase();
    if (clean && !tags.includes(clean)) setTags((p) => [...p, clean]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags((p) => p.filter((t) => t !== tag));

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === 'Backspace' && !tagInput && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const canSubmit = (text.trim().length > 0 || !!stagedFile) && !isPending;

  const typeColors: Record<ContentType, string> = {
    text: 'text-purple-400',
    link: 'text-blue-400',
    image: 'text-green-400',
    file: 'text-orange-400',
  };

  const typeLabels: Record<ContentType, string> = {
    text: '📝 Note',
    link: '🔗 Link',
    image: '🖼️ Image',
    file: '📎 File',
  };

  return (
    <div
      className={`glass-card p-4 transition-all duration-300 ${dragOver ? 'border-primary-500 glow-ring' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Staged File Preview */}
      {stagedFile && (
        <div className="mb-3 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {filePreview ? (
            <img src={filePreview} alt="preview" className="w-full max-h-40 object-cover" />
          ) : (
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-2xl">📎</span>
              <div>
                <p className="text-sm text-slate-300 font-medium">{stagedFile.name}</p>
                <p className="text-xs text-slate-500">{formatFileSize(stagedFile.size)} · {stagedFile.type || 'unknown'}</p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-xs text-slate-400">{stagedFile.name}</span>
            <button onClick={() => { setStagedFile(null); setFilePreview(null); setDetectedType('text'); setUploadProgress(0); }}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors">Remove</button>
          </div>
        </div>
      )}

      {/* Main text input */}
      {!stagedFile && (
        <textarea
          ref={textareaRef}
          className="w-full bg-transparent text-slate-100 placeholder-slate-500 resize-none outline-none text-sm leading-relaxed"
          placeholder="Type a note, paste a link, or drop a file here... Use #hashtags to organize"
          rows={3}
          style={{ minHeight: '72px', maxHeight: '200px' }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canSubmit) submitContent();
          }}
        />
      )}

      {/* Link Preview */}
      {detectedType === 'link' && (fetchingPreview || linkPreview) && !stagedFile && (
        <div className="mt-2 rounded-lg overflow-hidden" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
          {fetchingPreview ? (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 skeleton rounded-md flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-3/4 rounded" />
                <div className="skeleton h-2 w-1/2 rounded" />
              </div>
            </div>
          ) : linkPreview ? (
            <div className="flex gap-3 p-3">
              {linkPreview.image && (
                <img src={linkPreview.image} alt="" className="w-14 h-14 object-cover rounded-md flex-shrink-0" onError={(e) => (e.currentTarget.style.display = 'none')} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-primary-400 font-medium truncate">{linkPreview.domain}</p>
                <p className="text-sm text-slate-200 font-medium line-clamp-1">{linkPreview.title}</p>
                {linkPreview.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{linkPreview.description}</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        {tags.map((tag) => (
          <span key={tag} className="tag-badge">
            #{tag}
            <button onClick={() => removeTag(tag)} className="ml-0.5 hover:text-red-400 transition-colors leading-none">×</button>
          </span>
        ))}
        <input
          className="bg-transparent text-xs text-slate-300 placeholder-slate-600 outline-none min-w-[80px] flex-1"
          placeholder="+ add tag"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          onBlur={() => tagInput && addTag(tagInput)}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          {/* Type indicator — click to switch to note mode */}
          <button
            type="button"
            onClick={() => {
              setStagedFile(null);
              setFilePreview(null);
              setLinkPreview(null);
              setDetectedType('text');
              setText('');
              setUploadProgress(0);
              setTimeout(() => textareaRef.current?.focus(), 0);
            }}
            className={`text-xs font-medium ${typeColors[detectedType]} hover:opacity-80 transition-opacity cursor-pointer`}
            title="Click to switch to note mode"
          >
            {typeLabels[detectedType]}
          </button>

          {/* File upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-ghost !px-2 !py-1 !text-xs"
            title="Upload file or image"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
            </svg>
            Attach
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>

        <div className="flex items-center gap-2">
          {/* Upload progress */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <span className="text-xs text-primary-400">{uploadProgress}%</span>
          )}
          <span className="text-xs text-slate-600">Ctrl+Enter</span>
          <button
            onClick={() => submitContent()}
            disabled={!canSubmit}
            className="btn-primary !px-4 !py-1.5 !text-xs"
          >
            {isPending ? (
              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : 'Save'}
          </button>
        </div>
      </div>

      {/* Drag overlay */}
      {dragOver && (
        <div className="absolute inset-0 rounded-xl flex items-center justify-center pointer-events-none"
             style={{ background: 'rgba(59,130,246,0.1)', border: '2px dashed rgba(59,130,246,0.5)' }}>
          <p className="text-primary-300 font-medium text-sm">Drop to add to vault</p>
        </div>
      )}
    </div>
  );
}
