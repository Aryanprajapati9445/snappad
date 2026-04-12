import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ContentFilters } from '../types';

type ViewMode = 'grid' | 'list';

interface UIState {
  viewMode: ViewMode;
  sidebarOpen: boolean;
  filters: ContentFilters;
  setViewMode: (mode: ViewMode) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setFilters: (filters: Partial<ContentFilters>) => void;
  resetFilters: () => void;
}

const defaultFilters: ContentFilters = {
  q: '',
  type: '',
  tags: '',
  sort: 'newest',
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      viewMode: 'grid',
      sidebarOpen: true,
      filters: defaultFilters,
      setViewMode: (viewMode) => set({ viewMode }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setFilters: (partial) => set((s) => ({ filters: { ...s.filters, ...partial } })),
      resetFilters: () => set({ filters: defaultFilters }),
    }),
    {
      name: 'kv-ui',
      partialize: (state) => ({ viewMode: state.viewMode, sidebarOpen: state.sidebarOpen }),
    }
  )
);
