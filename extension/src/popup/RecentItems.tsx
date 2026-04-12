import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Content, PaginatedResponse } from '../lib/types';

function getTypeClass(type: string) {
  switch (type) {
    case 'link': return 'type-link';
    case 'text': return 'type-text';
    case 'image': return 'type-image';
    case 'file': return 'type-file';
    default: return 'type-text';
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'link': return '🔗';
    case 'text': return '📝';
    case 'image': return '🖼️';
    case 'file': return '📎';
    default: return '📄';
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function RecentItems() {
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<PaginatedResponse<Content>>('/content?limit=8&sort=newest')
      .then((res) => {
        setItems(res.data?.items ?? []);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{
            height: '56px', borderRadius: '6px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: '32px' }}>📭</div>
        <p style={{ fontWeight: 600 }}>Your vault is empty</p>
        <p className="text-sm">Save something using the Save tab!</p>
      </div>
    );
  }

  const openItem = (item: Content) => {
    const url = item.type === 'link' ? item.content : item.fileUrl;
    if (url) chrome.tabs.create({ url });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {items.map((item) => (
        <div
          key={item._id}
          className="item-row"
          onClick={() => openItem(item)}
          title={item.content ?? item.fileName ?? ''}
        >
          {/* Icon */}
          <div style={{
            width: '32px', height: '32px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            fontSize: '14px',
          }}>
            {item.type === 'link' && item.metadata?.favicon ? (
              <img
                src={item.metadata.favicon}
                alt=""
                style={{ width: '16px', height: '16px' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : getTypeIcon(item.type)}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="truncate font-medium" style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
              {item.title || item.metadata?.title || item.content || item.fileName || 'Untitled'}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span className={`type-badge ${getTypeClass(item.type)}`}>
                {item.type}
              </span>
              <span className="text-xs text-muted">{formatDate(item.createdAt)}</span>
            </div>
          </div>
        </div>
      ))}

      <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: '4px' }}>
        Showing latest {items.length} items
      </p>
    </div>
  );
}
