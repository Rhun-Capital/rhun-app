import { Token } from './token';
import { TokenMetadata } from './token';
import { BaseToolProps, ToolInvocationState } from './tools';

export interface TrackingFilters {
  minAmount?: number;
  specificToken?: string;
  platform?: string[];
  activityTypes?: string[];
  sort_by?: string;
  sort_order?: string;
}

export interface TrackingOptions {
  filters: TrackingFilters;
  showFilters: boolean;
  name: string;
  tags: string[];
  tagInput: string;
}

export interface TrackWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrack: (address: string, filters: TrackingFilters) => void;
  className?: string;
}

export interface AccountData {
  account: string;
  lamports: number;
  type: string;
  executable: boolean;
  owner_program: string;
  rent_epoch: number;
  is_oncurve: boolean;
}

export interface Transaction {
  hash: string;
  timestamp: number;
  from: string;
  to: string;
  value: number;
  fee: number;
  status: 'success' | 'pending' | 'failed';
  type: 'transfer' | 'swap' | 'approve' | 'other';
  token?: {
    address: string;
    symbol: string;
    decimals: number;
  };
  metadata?: Record<string, any>;
}

export interface Activity {
  block_time: number;
  activity_type: string;
  value: number;
  routers: {
    token1: string;
    token1_decimals: number;
    amount1: number;
    token2: string;
    token2_decimals: number;
    amount2: number;
  };
  time: string;
  from_address: string;
}

export interface ActivityResponse {
  data: Activity[];
  metadata: {
    tokens: {
      [key: string]: {
        token_address: string;
        token_name: string;
        token_symbol: string;
        token_icon: string;
      }
    }
  };
}

export interface AccountInfoProps {
  toolCallId: string;
  toolInvocation: {
    toolName: string;
    args: { message: string };
    result?: { success: boolean; data: AccountData } | { error: string };
  };
} 