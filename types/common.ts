// Basic shared interfaces
export interface BaseProps {
  className?: string;
}

// Token related interfaces
export interface TokenBase {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface TokenBalance extends TokenBase {
  amount: number;
  price: number;
  value: number;
}

export interface TokenMetadata extends TokenBase {
  chainId?: number;
}

export interface TokenDisplayMetadata {
  token_address: string;
  token_name: string;
  token_symbol: string;
  token_icon: string;
}

// Holder related interfaces
export interface HolderBase {
  address: string;
  balance: number;
  percentage: number;
  value: number;
}

export interface HolderData extends HolderBase {
  rank: number;
}

// Balance related interfaces
export interface BalanceData {
  totalBalance: number;
  tokens: TokenBalance[];
  lastUpdated: number;
}

// Tool invocation related interfaces
export interface BaseToolInvocation {
  toolName: string;
  args: Record<string, any>;
  state: 'call' | 'partial-call' | 'result';
  result?: any;
}

// Tracking related interfaces
export interface TrackingFilters {
  minAmount?: number;
  maxAmount?: number;
  includeTokens?: boolean;
  includeNFTs?: boolean;
  includeTrades?: boolean;
} 