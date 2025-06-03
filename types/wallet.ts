import { ReactNode } from 'react';
import type { TokenIconProps } from './ui';
import type { WatcherData, TrackingFilters, LastActivityWrapper } from './watcher';

export interface TokenHolding {
  mint: string;
  amount: number;
  decimals: number;
  uiAmount: number;
}

export interface Token {
  token_address: string;
  token_account: string;
  token_name: string;
  token_symbol: string;
  token_decimals: number;
  token_icon: string;
  amount: number;
  owner: string;
  usd_value: number;
  usd_price: number;
  formatted_amount: number;
}

export interface SendToken {
  token_account: string;
  token_address: string;
  amount: number;
  token_decimals: number;
  owner: string;
  formatted_amount: number;
  token_name: string;
  token_symbol: string;
  token_icon: string;
  usd_price: number;
  usd_value: number;
}

export interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  amount: number;
  price: number;
  value: number;
}

export interface TokenTransaction {
  hash: string;
  timestamp: string;
  type: 'send' | 'receive' | 'swap';
  amount: number;
  token_decimals: number;
  token_name: string;
  token_symbol: string;
  token_icon: string;
  usd_price: number;
  usd_value: number;
  from_address: string;
  to_address: string;
  fee: {
    amount: number;
    usd_value: number;
  };
  status: 'success' | 'pending' | 'failed';
}

export interface TokenTransfer {
  hash: string;
  timestamp: string;
  type: 'send' | 'receive';
  amount: number;
  token_decimals: number;
  token_name: string;
  token_symbol: string;
  token_icon: string;
  usd_price: number;
  usd_value: number;
  from_address: string;
  to_address: string;
  fee: {
    amount: number;
    usd_value: number;
  };
  status: 'success' | 'pending' | 'failed';
}

export interface TokenSwap {
  hash: string;
  timestamp: string;
  type: 'swap';
  from_token: {
    amount: number;
    token_decimals: number;
    token_name: string;
    token_symbol: string;
    token_icon: string;
    usd_price: number;
    usd_value: number;
  };
  to_token: {
    amount: number;
    token_decimals: number;
    token_name: string;
    token_symbol: string;
    token_icon: string;
    usd_price: number;
    usd_value: number;
  };
  fee: {
    amount: number;
    usd_value: number;
  };
  status: 'success' | 'pending' | 'failed';
}

export interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: { wallets: { solana: string } };
  tokens: Token[];
  token: Token | 'SOL';
  solanaBalance?: {
    amount: number;
    usdValue: number;
    logoURI: string;
  };
  onSwapComplete?: () => void;
  className?: string;
}

export interface DelegateWalletButtonProps {
  walletAddress: string;
  chainType: 'ethereum' | 'solana';
  onDelegationChange?: (isDelegated: boolean) => void;
  onSuccess?: () => void;
  className?: string;
}

export interface ReceiveModalProps {
  isOpen: boolean;
  agent: { wallets: { solana: string } };
  onClose: () => void;
  selectedWalletAddress?: string | null;
  className?: string;
}

export interface AutoTradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  onSetupComplete: () => void;
  className?: string;
}

export interface SolanaQueryProps {
  addresses: string[];
  className?: string;
}

export interface BalanceData {
  totalBalance: number;
  tokens: TokenBalance[];
  lastUpdated: number;
}

export type { TokenIconProps, WatcherData, TrackingFilters, LastActivityWrapper }; 