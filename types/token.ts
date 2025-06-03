export interface TokenTabProps {
  agentId: string;
}

export interface TokenData {
  tokenName: string;
  tokenTicker: string;
  tokenDescription: string;
  twitter: string;
  website: string;
  telegram: string;
  twitch: string;
  isAntiPvp: boolean;
}

export interface TokenDisplayMetadata {
  token_address: string;
  token_name: string;
  token_symbol: string;
  token_icon: string;
}

export interface HolderData {
  address?: string;
  owner?: string;
  balance?: string;
  amount?: number;
  decimals?: number;
  percentage?: number;
  value?: number;
}

export interface Token {
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

export interface JupiterToken {
  address: string;
  chainId: number;
  decimals: number;
  logoURI: string;
  name: string;
  symbol: string;
  tags: string[];
}

export type SelectionType = 'from' | 'to' | null;

export interface TokenHolder {
  owner: string;
  amount: number;
  decimals: number;
  percentage?: number;
  value?: number;
}

export interface TokenMetadata {
  token_address: string;
  token_name: string;
  token_symbol: string;
  token_icon: string;
}

export interface PaginatedTokens {
  tokens: JupiterToken[];
  currentPage: number;
  totalTokens: number;
}

export interface TokenInfoProps {
  toolCallId: string;
  toolInvocation: {
    toolName: string;
    args: { message: string };
    result?: any;
  };
  className?: string;
}

export interface UpdateToolInvocationParams {
  toolCallId: string;
  toolName: string;
  args: Record<string, any>;
  result?: any;
  state: 'call' | 'partial-call' | 'result';
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
  toolCallId: string;
  toolName: string;
  args: {
    fromToken: string;
    toToken: string;
    amount: string;
    slippage?: number;
  };
  result?: SwapToolResult;
}

export interface TokenHoldingsProps {
  toolCallId: string;
  toolInvocation: {
    toolName: string;
    args: { message: string };
    result?: {data: Token[]};
  };
}

export interface TopHoldersDisplayProps {
  toolCallId: string;
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    result?: any;
    state: 'call' | 'partial-call' | 'result';
  };
}

export interface Quote {
  inAmount: string;
  outAmount: string;
  priceImpact: string;
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
} 