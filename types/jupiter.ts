import { Token } from './wallet';

export type SelectionType = 'from' | 'to' | null;

export interface JupiterToken {
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  logoURI?: string;
  tags?: string[];
  extensions?: Record<string, any>;
}

export interface PaginatedTokens {
  tokens: JupiterToken[];
  currentPage: number;
  totalTokens: number;
}

export interface Quote {
  route: any;
  outAmount: number;
  otherAmountThreshold: number;
  swapMode: string;
  priceImpactPct: number;
  platformFee: number;
  slippageBps: number;
}

export interface SwapParams {
  fromToken: Token;
  toToken: Token;
  amount: string;
  slippage: number;
  wallet: any;
}

export interface SwapResult {
  signature: string;
  success: boolean;
  error?: string;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
  chainId: number;
  logoURI?: string;
}

export interface TokenInfo {
  address: string;
  decimals: number;
  name: string;
  symbol: string;
  logoURI?: string;
  tags?: string[];
  extensions?: {
    [key: string]: any;
  };
}

export interface TokenList {
  name: string;
  logoURI: string;
  keywords: string[];
  tags: {
    [key: string]: {
      name: string;
      description: string;
    };
  };
  timestamp: string;
  tokens: TokenInfo[];
}

export interface SwapRoute {
  inAmount: string;
  outAmount: string;
  priceImpactPct: number;
  marketInfos: Array<{
    id: string;
    label: string;
    inputMint: string;
    outputMint: string;
    notEnoughLiquidity: boolean;
    inAmount: string;
    outAmount: string;
    priceImpactPct: number;
    liquidityFee: number;
    platformFee: number;
  }>;
  slippageBps: number;
  otherAmountThreshold: string;
  swapMode: string;
} 