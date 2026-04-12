import React from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import SmartInput from '../features/content/SmartInput';
import ContentFeed from '../features/content/ContentFeed';
import Sidebar from '../features/content/Sidebar';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const { viewMode, setViewMode, sidebarOpen, toggleSidebar, filters, setFilters, resetFilters } = useUIStore();
  const navigate = useNavigate();

  // Keep user session alive
  useQuery({
    queryKey: ['me'],
    queryFn: authService.getMe,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch { /* ignore */ }
    logout();
    navigate('/login');
    toast.success('Logged out');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <header className="flex-shrink-0 sticky top-0 z-40"
              style={{ background: 'rgba(15,23,42,0.9)', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center justify-between px-4 h-14 max-w-screen-2xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <button onClick={toggleSidebar} className="btn-ghost !px-2 !py-2" title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {sidebarOpen
                  ? <><path d="M3 12h18M3 6h18M3 18h18"/></>
                  : <><path d="M3 12h18M3 6h18M3 18h18"/></>}
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="font-bold text-sm text-gradient hidden sm:block">Snappad</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.6)' }}>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1.5 text-xs transition-all ${viewMode === 'grid' ? 'bg-primary-600/30 text-primary-300' : 'text-slate-500 hover:text-slate-300'}`}
                title="Grid view"
              >
                ⊞
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1.5 text-xs transition-all ${viewMode === 'list' ? 'bg-primary-600/30 text-primary-300' : 'text-slate-500 hover:text-slate-300'}`}
                title="List view"
              >
                ≡
              </button>
            </div>

            {/* User menu */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/profile')}
                title="View profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#6366f1';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.08)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                }}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                     style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="text-slate-300 text-xs hidden sm:block">{user?.name}</span>
              </button>
              <button onClick={handleLogout} className="btn-ghost !px-2 !py-1.5 !text-xs" title="Logout">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden max-w-screen-2xl mx-auto w-full">
        {/* Sidebar (desktop: inline, mobile: overlay) */}
        <Sidebar
          filters={filters}
          onFilterChange={setFilters}
          onReset={resetFilters}
          isOpen={sidebarOpen}
          onClose={toggleSidebar}
        />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Smart Input */}
          <div className="relative mb-6">
            <SmartInput />
          </div>

          {/* Feed header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300">
              {filters.q
                ? `Results for "${filters.q}"`
                : filters.type
                ? `${filters.type.charAt(0).toUpperCase() + filters.type.slice(1)}s`
                : filters.tags
                ? `Tagged: ${filters.tags.split(',').map((t: string) => `#${t}`).join(', ')}`
                : 'Your Vault'}
            </h2>
          </div>

          <ContentFeed filters={filters} viewMode={viewMode} />
        </main>
      </div>
    </div>
  );
}
