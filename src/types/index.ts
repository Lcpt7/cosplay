export interface CharacterConfig {
  id: string;
  name: string;
  available: boolean;
  avatar: string;
  artwork: string;
  background: string;
  description: string;
  personality: string;
  tags: string[];
  firstMessage?: string;
  backendCharacterId?: string;
}

export type MessageRole = 'user' | 'character' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  streaming?: boolean;
}

export interface ChatSession {
  characterId: string;
  messages: ChatMessage[];
  createdAt: number;
}

export type PageId = 'home' | 'select' | 'preview' | 'chat';