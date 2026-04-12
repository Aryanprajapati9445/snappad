import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Content, UpdateContentPayload } from '../../types';
import { contentService } from '../../services/content.service';

interface EditModalProps {
  item: Content;
  onClose: () => void;
}

export default function EditModal({ item, onClose }: EditModalProps) {
  const queryClient = useQueryClient();
  const [tags, setTags] = useState<string[]>(item.tags);
  const [tagInput, setTagInput] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<UpdateContentPayload>({
    defaultValues: { title: item.title || '', content: item.content || '' },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: UpdateContentPayload) => contentService.update(item._id, { ...data, tags }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Saved!');
      onClose();
    },
    onError: () => toast.error('Failed to update'),
  });

  const addTag = (t: string) => {
    const clean = t.trim().replace(/^#/, '').toLowerCase();
    if (clean && !tags.includes(clean)) setTags((p) => [...p, clean]);
    setTagInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-card w-full max-w-lg z-10 p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gradient">Edit Entry</h2>
          <button onClick={onClose} className="btn-ghost !px-2 !py-1">✕</button>
        </div>

        <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Title</label>
            <input type="text" className="glass-input" placeholder="Title (optional)" {...register('title')} />
          </div>

          {(item.type === 'text' || item.type === 'link') && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                {item.type === 'link' ? 'URL' : 'Content'}
              </label>
              <textarea
                className="glass-input resize-none"
                rows={item.type === 'text' ? 6 : 2}
                {...register('content', { required: item.type === 'text' ? 'Content required' : false })}
              />
              {errors.content && <p className="text-red-400 text-xs mt-1">{errors.content.message}</p>}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Tags</label>
            <div className="glass-input flex flex-wrap gap-1.5 min-h-[44px] items-center">
              {tags.map((t) => (
                <span key={t} className="tag-badge">
                  #{t}
                  <button type="button" onClick={() => setTags((p) => p.filter((x) => x !== t))} className="ml-1">×</button>
                </span>
              ))}
              <input
                className="bg-transparent text-sm text-slate-300 placeholder-slate-600 outline-none flex-1 min-w-[60px]"
                placeholder="+ tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
                  if (e.key === 'Backspace' && !tagInput && tags.length) setTags((p) => p.slice(0, -1));
                }}
                onBlur={() => tagInput && addTag(tagInput)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
