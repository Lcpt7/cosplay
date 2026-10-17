import { create } from 'zustand';
import { characters } from '@/config/characters';
import type { CharacterConfig } from '@/types';

interface CharacterState {
  list: CharacterConfig[];
  currentIndex: number;
  current: () => CharacterConfig;
  prev: () => CharacterConfig;
  next: () => CharacterConfig;
  select: (index: number) => void;
  selectNext: () => void;
  selectPrev: () => void;
  getById: (id: string) => CharacterConfig | undefined;
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  list: characters,
  currentIndex: 0,
  current: () => get().list[get().currentIndex],
  prev: () => {
    const { list, currentIndex } = get();
    return list[(currentIndex - 1 + list.length) % list.length];
  },
  next: () => {
    const { list, currentIndex } = get();
    return list[(currentIndex + 1) % list.length];
  },
  select: (index) => set({ currentIndex: ((index % get().list.length) + get().list.length) % get().list.length }),
  selectNext: () => set((s) => ({ currentIndex: (s.currentIndex + 1) % s.list.length })),
  selectPrev: () => set((s) => ({ currentIndex: (s.currentIndex - 1 + s.list.length) % s.list.length })),
  getById: (id) => get().list.find((c) => c.id === id),
}));