import { Message } from './chat';

export interface ToolResult {
  type: string;
  data: any;
}

export interface HolderData {
  address: string;
  balance: number;
  percentage: number;
  rank: number;
  value: number;
}

export interface BaseToolInvocation {
  id: string;
  type: string;
  state: 'result' | 'partial-call' | 'call';
  result?: any;
}

export interface ToolResultInvocation extends BaseToolInvocation {
  state: 'result';
  result: any;
}

export interface ToolPartialInvocation extends BaseToolInvocation {
  state: 'partial-call';
  result?: any;
}

export interface ToolCallInvocation extends BaseToolInvocation {
  state: 'call';
}

export type CustomToolInvocation = ToolResultInvocation | ToolPartialInvocation | ToolCallInvocation;

export interface CustomMessage extends Omit<Message, 'toolInvocations'> {
  toolInvocations?: CustomToolInvocation[];
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  wallets: {
    solana?: string;
  };
}

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
} 