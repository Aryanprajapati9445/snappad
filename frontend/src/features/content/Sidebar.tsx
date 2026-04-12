import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { contentService } from '../../services/content.service';
import { ContentFilters } from '../../types';
import { useDebounce } from '../../hooks/useDebounce';

interface SidebarProps {
  filters: ContentFilters;
  onFilterChange: (f: Partial<ContentFilters>) => void;
  onReset: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const CONTENT_TYPES = [
  { value: '', label: 'All', icon: '✦' },
  { value: 'text', label: 'Notes', icon: '📝' },
  { value: 'link', label: 'Links', icon: '🔗' },
  { value: 'image', label: 'Images', icon: '🖼️' },
  { value: 'file', label: 'Files', icon: '📎' },
] as const;

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'pinned', label: 'Pinned first' },
] as const;

export default function Sidebar({ filters, onFilterChange, onReset, isOpen, onClose }: SidebarProps) {
  const [searchInput, setSearchInput] = React.useState(filters.q || '');
  const debouncedSearch = useDebounce(searchInput, 400);

  React.useEffect(() => {
    onFilterChange({ q: debouncedSearch });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: contentService.getTags,
    staleTime: 30000,
  });

  const tags = tagsData ?? [];
  const activeTagList = filters.tags ? filters.tags.split(',').filter(Boolean) : [];

  const toggleTag = (tag: string) => {
    const current = activeTagList;
    const updated = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    onFilterChange({ tags: updated.join(',') });
  };

  const innerContent = (
    <div className="flex flex-col gap-5 h-full" style={{ width: '260px', padding: '0 8px' }}>

      {/* Search */}
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Search</label>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="glass-input !pl-9 !text-xs !py-2"
            placeholder="Search your vault..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {/* Type filter */}
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Type</label>
        <div className="space-y-0.5">
          {CONTENT_TYPES.map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() => onFilterChange({ type: value as ContentFilters['type'] })}

              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 text-left
                ${filters.type === value
                  ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Sort</label>
        <select
          className="glass-input !text-xs !py-2"
          value={filters.sort || 'newest'}
          onChange={(e) => onFilterChange({ sort: e.target.value as ContentFilters['sort'] })}
          style={{ background: 'rgba(15,23,42,0.8)' }}
        >
          {SORTS.map(({ value, label }) => (
            <option key={value} value={value} style={{ background: '#1e293b' }}>{label}</option>
          ))}
        </select>
      </div>

      {/* Tag cloud */}
      {tags.length > 0 && (
        <div className="flex-1 min-h-0">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tags</label>
            {activeTagList.length > 0 && (
              <button onClick={() => onFilterChange({ tags: '' })} className="text-xs text-slate-500 hover:text-red-400 transition-colors">
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 overflow-y-auto" style={{ maxHeight: '180px' }}>
            {tags.map(({ tag, count }) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`tag-badge ${activeTagList.includes(tag) ? 'active' : ''}`}
              >
                #{tag}
                <span className="text-[9px] opacity-60 ml-1">{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reset */}
      {(filters.q || filters.type || filters.tags || filters.sort !== 'newest') && (
        <button onClick={onReset} className="btn-ghost !text-xs !py-1.5 border border-white/10">
          ↩️ Reset filters
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* ── Mobile: fixed overlay drawer ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex md:hidden"
          onClick={onClose}
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <aside
            className="relative h-full overflow-y-auto py-6 pl-4 pr-2"
            style={{
              width: '280px',
              background: 'rgba(15,23,42,0.97)',
              borderRight: '1px solid rgba(255,255,255,0.07)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-3 btn-ghost !px-2 !py-1.5"
              aria-label="Close sidebar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
            {innerContent}
          </aside>
        </div>
      )}

      {/* ── Desktop: inline panel ── */}
      <aside
        className="hidden md:block flex-shrink-0 overflow-y-auto py-6 pl-4"
        style={{
          width: isOpen ? '268px' : '0',
          minWidth: isOpen ? '268px' : '0',
          opacity: isOpen ? 1 : 0,
          overflow: 'hidden',
          transition: 'all 0.3s ease',
        }}
      >
        {innerContent}
      </aside>
    </>
  );
}
