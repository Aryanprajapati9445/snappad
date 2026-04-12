import React, { useRef, useCallback, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { contentService } from '../../services/content.service';
import { ContentFilters, Content } from '../../types';
import ContentCard from './ContentCard';
import ContentViewModal from './ContentViewModal';

interface ContentFeedProps {
  filters: ContentFilters;
  viewMode: 'grid' | 'list';
}

const LIMIT = 20;

export default function ContentFeed({ filters, viewMode }: ContentFeedProps) {
  const { ref: bottomRef, inView } = useInView({ threshold: 0 });
  const [viewedItem, setViewedItem] = useState<Content | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useInfiniteQuery({
    queryKey: ['content', filters],
    queryFn: ({ pageParam = 1 }) =>
      contentService.getAll({ ...filters, page: pageParam as number, limit: LIMIT }),
    getNextPageParam: (last) => (last.pagination.hasNext ? last.pagination.page + 1 : undefined),
    initialPageParam: 1,
  });

  // Auto-fetch next page when bottom of feed is visible
  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];

  if (isLoading) {
    return (
      <div className={viewMode === 'grid'
        ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'
        : 'flex flex-col gap-3'}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card" style={{ padding: '16px', height: viewMode === 'grid' ? '200px' : '72px' }}>
            <div className="skeleton h-3 w-1/4 rounded mb-3" />
            <div className="skeleton h-4 w-3/4 rounded mb-2" />
            <div className="skeleton h-3 w-full rounded mb-1" />
            <div className="skeleton h-3 w-2/3 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-slate-400">Failed to load content. Please try again.</p>
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className="glass-card p-12 text-center animate-fade-in">
        <div className="text-5xl mb-4">🔍</div>
        <h3 className="text-slate-300 font-medium mb-2">
          {filters.q || filters.type || filters.tags ? 'No results found' : 'Your vault is empty'}
        </h3>
        <p className="text-slate-500 text-sm">
          {filters.q || filters.type || filters.tags
            ? 'Try adjusting your search or filters'
            : 'Start by adding a note, link, image, or file above'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className={viewMode === 'grid'
        ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'
        : 'flex flex-col gap-3'}>
        {allItems.map((item, idx) => (
          <div
            key={item._id}
            className="animate-slide-up"
            style={{
              animationDelay: `${Math.min(idx, 8) * 30}ms`,
              animationFillMode: 'both',
              ...(viewMode === 'grid' ? { height: '220px' } : {}),
            }}
          >
            <ContentCard item={item} viewMode={viewMode} onView={setViewedItem} />
          </div>
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={bottomRef} className="h-8 flex items-center justify-center mt-4">
        {isFetchingNextPage && (
          <svg className="animate-spin w-5 h-5 text-primary-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        )}
        {!hasNextPage && allItems.length >= LIMIT && (
          <p className="text-slate-600 text-xs">All items loaded · {allItems.length} total</p>
        )}
      </div>

      {/* Single global view modal — only one at a time */}
      {viewedItem && (
        <ContentViewModal item={viewedItem} onClose={() => setViewedItem(null)} />
      )}
    </div>
  );
}
