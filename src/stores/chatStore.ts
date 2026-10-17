import { create } from 'zustand';
import type { ChatMessage } from '@/types';

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  activeCharacterId: string | null;
  setActiveCharacter: (id: string) => void;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  appendToMessage: (id: string, chunk: string) => void;
  finishStreaming: (id: string) => void;
  clear: () => void;
}

let msgCounter = 0;
const genId = () => `msg-${++msgCounter}-${Date.now()}`;

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  activeCharacterId: null,
  setActiveCharacter: (id) => set({ activeCharacterId: id, messages: [] }),
  addMessage: (msg) => {
    const id = genId();
    set((s) => ({
      messages: [...s.messages, { ...msg, id, timestamp: Date.now() }],
      isStreaming: msg.streaming ?? false,
    }));
    return id;
  },
  appendToMessage: (id, chunk) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, content: m.content + chunk } : m)),
    })),
  finishStreaming: (id) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, streaming: false } : m)),
      isStreaming: false,
    })),
  clear: () => set({ messages: [], isStreaming: false }),
}));