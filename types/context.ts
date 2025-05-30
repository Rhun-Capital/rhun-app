import { ReactNode } from 'react';
import { Message } from './chat';

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  agentId: string;
  userId: string;
  isArchived: boolean;
}

export interface ChatContextType {
  chats: Chat[];
  currentChat: Chat | null;
  setCurrentChat: (chat: Chat | null) => void;
  addChat: (chat: Chat) => void;
  updateChat: (chat: Chat) => void;
  deleteChat: (chatId: string) => void;
  archiveChat: (chatId: string) => void;
}

export interface SolanaContextType {
  connection: any;
  wallet: any;
  connected: boolean;
  publicKey: string | null;
  signTransaction: (transaction: any) => Promise<any>;
  signAllTransactions: (transactions: any[]) => Promise<any[]>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  disconnect: () => Promise<void>;
}

export interface ModalContextType {
  isOpen: boolean;
  modalContent: ReactNode;
  openModal: (content: ReactNode) => void;
  closeModal: () => void;
} 