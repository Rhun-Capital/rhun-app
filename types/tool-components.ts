import { Token } from './token';
import { TaskProps } from './task';
import { BaseCryptoNewsProps } from './news';
import { BaseToolProps, ToolInvocationBase } from './tools';

export interface TrackingFilters {
  minAmount?: number;
  specificToken?: string;
  platform?: string[];
  activityTypes?: string[];
  sort_by?: string;
  sort_order?: string;
}

export interface TrackWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  walletAddress: string;
  userId: string;
  className?: string;
}

export interface FearGreedProps extends BaseToolProps {
  toolInvocation: ToolInvocationBase & {
    result?: {
      value: number;
      classification: string;
    };
  };
  value: number;
}

export interface SwapToken {
  token_address: string;
  token_icon: string;
  token_name: string;
  token_symbol: string;
  token_decimals: number;
  usd_price: number;
  usd_value: number;
  formatted_amount: number;
}

export interface UpdateToolInvocationParams {
  chatId: string;
  toolCallId: string;
  status: 'success' | 'error' | 'in_progress';
  result: {
    transactionHash?: string;
    status: 'success' | 'error' | 'in_progress';
    error?: any;
    fromToken?: string;
    toToken?: string;
    amount?: string;
    slippage?: number;
    message?: string;
  };
}

export interface SwapToolResult {
  transactionHash?: string;
  status?: 'success' | 'error';
  error?: string;
  fromToken?: string;
  toToken?: string;
  amount?: string;
  slippage?: number;
}

export interface SwapToolInvocation {
  toolName: string;
  toolCallId: string;
  status?: 'success' | 'error';
  args: {
    fromToken: string;
    toToken: string;
    amount: string;
    slippage?: number;
  };
  result?: SwapToolResult;
} 