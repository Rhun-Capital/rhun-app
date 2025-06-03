import type { Tool } from './tools';
import { CoinData } from './market';

export interface Chat {
  id: string;
  chatId: string;
  agentId: string;
  agentName: string;
  lastMessage: string;
  lastUpdated: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  isTemplate?: boolean;
  messages?: Message[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  toolInvocations?: ToolInvocation[];
}

export interface ToolInvocation {
  id: string;
  toolName: string;
  args: Record<string, any>;
  result?: any;
  state: ToolInvocationState;
}

export type ToolInvocationState = 'result' | 'partial-call' | 'call';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  createdAt?: Date;
  toolInvocations?: any[];
  messageId?: string;
}

export interface ChatSession {
  id: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  title?: string;
  summary?: string;
  agentId?: string;
}

export interface ChatHistory {
  sessions: ChatSession[];
  total: number;
  hasMore: boolean;
}

export interface ChatSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  tools: Tool[];
}

export type { Tool };

export interface ChatContextType {
  chats: Chat[];
  currentChat: Chat | null;
  setCurrentChat: (chat: Chat | null) => void;
  addChat: (chat: Chat) => void;
  updateChat: (chat: Chat) => void;
  deleteChat: (chatId: string) => void;
  archiveChat: (chatId: string) => void;
  starChat: (chatId: string) => void;
  markChatAsRead: (chatId: string) => void;
  markChatAsUnread: (chatId: string) => void;
  clearChats: () => void;
  loading: boolean;
  error: Error | null;
} 