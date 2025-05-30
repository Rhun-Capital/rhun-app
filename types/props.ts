export interface PortfolioValueProps {
  toolCallId: string;
  toolInvocation: {
    toolName: string;
    args: { message: string };
    result?: { totalValue: number };
  };
}

export interface BalanceProps {
  address: string;
}

export interface FearGreedProps {
  value: number;
}

export interface GlobalMarketProps {
  refreshInterval?: number;
}

export interface WhaleAnalysisProps {
  address: string;
}

export interface QuoteSwapProps {
  fromToken: string;
  toToken: string;
  amount: number;
}

export interface TrendingCoinsProps {
  limit?: number;
}

export interface RecentDexScreenerProps {
  limit?: number;
}

export interface TrackWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface TopHoldersDisplayProps {
  tokenAddress: string;
  limit?: number;
}

export interface WhaleActivityProps {
  address: string;
}

export interface NftCollectionProps {
  address: string;
}

export interface NewsAnalysisProps {
  symbol: string;
}

export interface OptionsAnalysisProps {
  symbol: string;
}

export interface AccountInfoProps {
  address: string;
}

export type SelectionType = 'from' | 'to' | null;
export type FilterType = 'all' | 'templates' | 'custom'; 