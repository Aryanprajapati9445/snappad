import { useState } from 'react';
import { clearAll } from '../lib/storage';
import { User } from '../lib/types';
import QuickSave from './QuickSave';
import RecentItems from './RecentItems';
import Profile from './Profile';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

type Tab = 'save' | 'recent';

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('save');
  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = async () => {
    await clearAll();
    onLogout();
  };

  if (showProfile) {
    return <Profile user={user} onBack={() => setShowProfile(false)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '480px' }}>
      {/* Header */}
      <div className="popup-header">
        <div className="popup-logo">
          <div className="popup-logo-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="popup-logo-text">Snappad</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Clickable user chip → opens Profile */}
          <button
            onClick={() => setShowProfile(true)}
            title="View profile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#6366f1';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.08)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)';
            }}
          >
            <div style={{
              width: '20px', height: '20px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 700, color: '#fff',
              flexShrink: 0,
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name}
            </span>
          </button>
          <button
            className="btn btn-ghost"
            style={{ padding: '4px 8px', fontSize: '11px' }}
            onClick={handleLogout}
            title="Sign out"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'save' ? 'active' : ''}`}
          onClick={() => setActiveTab('save')}
        >
          💾 Save
        </button>
        <button
          className={`tab-btn ${activeTab === 'recent' ? 'active' : ''}`}
          onClick={() => setActiveTab('recent')}
        >
          🕐 Recent
        </button>
      </div>

      {/* Content */}
      <div className="popup-body">
        {activeTab === 'save' ? <QuickSave /> : <RecentItems />}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
      }}>
        <a
          href="http://localhost:5173"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'none' }}
          onMouseOver={(e) => (e.currentTarget.style.color = '#a5b4fc')}
          onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          Open Snappad ↗
        </a>
      </div>
    </div>
  );
}
