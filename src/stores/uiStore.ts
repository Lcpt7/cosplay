import { create } from 'zustand';
import type { PageId } from '@/types';

interface UiState {
  currentPage: PageId;
  isTransitioning: boolean;
  settingsOpen: boolean;
  setPage: (page: PageId) => void;
  setTransitioning: (v: boolean) => void;
  toggleSettings: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  currentPage: 'home',
  isTransitioning: false,
  settingsOpen: false,
  setPage: (page) => set({ currentPage: page }),
  setTransitioning: (v) => set({ isTransitioning: v }),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
}));