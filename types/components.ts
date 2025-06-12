import { ReactNode } from 'react';
import type { TokenIconProps, CopyButtonProps, AccordionProps, ImageSelectProps } from './ui';
import { Token } from './token';
import { CoinData, GlobalMarketData } from './market';
import { AccountData } from './account';
import { TaskProps } from './task';
import { FredSearchResult } from './fred';
import { DexScreenerPair } from './dexscreener';
import { AIToolInvocation, BaseToolProps, ToolInvocationState, Exchange } from './tools';

// Sidebar related types
export interface BaseSidebarProps {
  className?: string;
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
}

export interface ChatSidebarProps extends BaseSidebarProps {
  agent: any;
  onToggle: () => void;
  onToolSelect: (command: string) => void;
  refreshAgent: () => void;
}

// Subscription related types
export interface SubscriptionManagementProps {
  userId: string;
  wallet: string;
  onSubscriptionChange?: () => void;
}

export interface CheckoutButtonProps {
  userId: string;
  onCheckoutComplete?: () => void;
  className?: string;
}

export interface RhunCheckoutProps {
  onCheckoutComplete?: () => void;
  className?: string;
}

// UI component types
export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export type ComponentCategory = "Wallet" | "Portfolio" | "Analytics" | "Search" | "Market";
export type ModalType = 'transfer' | 'receive' | 'swap' | null;

export interface ToolInvocationBase {
  toolName: string;
  args: Record<string, any>;
  result?: any;
  state: 'result' | 'partial-call' | 'call';
}

export interface BaseComponentProps {
  toolCallId: string;
  toolInvocation: ToolInvocationBase;
  className?: string;
}

export interface TokenHoldingsProps extends BaseComponentProps {
  toolInvocation: ToolInvocationBase & {
    result?: { data: Token[] };
  };
}

export interface TokenInfoProps {
  address: string;
  onInfoUpdate?: (info: any) => void;
  className?: string;
}

export interface MarketMoversProps {
  onMoversUpdate?: (movers: any[]) => void;
  className?: string;
}

export interface NewsAnalysisProps {
  query: string;
  onAnalysisUpdate?: (analysis: any) => void;
  className?: string;
}

export interface OptionsAnalysisProps {
  symbol: string;
  onAnalysisUpdate?: (analysis: any) => void;
  className?: string;
}

export interface PortfolioValueProps {
  address: string;
  onValueUpdate?: (value: number) => void;
  className?: string;
}

export interface SolanaTransactionVolumeProps extends BaseToolProps {
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    result?: {
      volume: {
        volumeUSD: number;
        volumeSOL: number;
        timeframe: string;
        priceChange24h: number;
      };
      count: {
        transactionCount: number;
        timeframe: string;
      };
    };
    state: ToolInvocationState;
  };
}

export interface WhaleActivityProps extends BaseToolProps {
  toolInvocation: {
    toolName: string;
    args: { message: string };
    result?: {
      transactions: Array<{
        hash: string;
        type: 'buy' | 'sell';
        timestamp: number;
        amount: number;
        token: string;
        from: string;
        to: string;
        explorerUrl: string;
      }>;
    };
    state: 'result' | 'partial-call' | 'call';
  };
}

export interface WebResearchProps {
  query: string;
  onResearchUpdate?: (research: any) => void;
  className?: string;
}

export interface FredAnalysisProps extends BaseToolProps {
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    result?: {
      series: string;
      data: Array<{
        date: string;
        value: number;
      }>;
      title?: string;
      units?: string;
      frequency?: string;
    };
    state: ToolInvocationState;
  };
  onAnalysisUpdate?: (analysis: any) => void;
  className?: string;
}

export interface MarketCategoriesProps extends BaseToolProps {
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    result?: Record<string, any>;
    state: ToolInvocationState;
  };
}

export interface RecentNewsProps {
  query: string;
  onNewsUpdate?: (news: any[]) => void;
  className?: string;
}

export interface TopNftsProps {
  onNftsUpdate?: (nfts: any[]) => void;
  className?: string;
}

export interface FredSearchProps extends BaseToolProps {
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    result?: FredSearchResult;
    state: ToolInvocationState;
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

export interface RecentCoinsProps {
  toolCallId: string;
  toolInvocation: AIToolInvocation & {
    result?: {
      [key: string]: CoinData;
    };
  };
}

export interface SearchTokensProps {
  onTokensUpdate?: (tokens: any[]) => void;
  className?: string;
}

export interface TrackWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrack: (address: string, filters: any) => void;
  className?: string;
}

export interface CryptoNewsProps {
  className?: string;
}

export interface BrowserUseResultProps {
  className?: string;
}

export interface TopHoldersDisplayProps extends BaseToolProps {
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    result?: {
      holders: Array<{
        address: string;
        balance: number;
        percentage: number;
        rank: number;
        value: number;
      }>;
    };
    state: 'result' | 'partial-call' | 'call';
  };
}

export interface FearGreedProps {
  toolCallId: string;
  toolInvocation: {
    toolName: string;
    args: { message: string };
    result?: {
      value: number;
      classification: string;
    };
  };
}

export interface BalanceProps extends BaseToolProps {
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    result?: {
      balance?: number;
      address?: string;
    };
    state: ToolInvocationState;
  };
}

export interface TrendingCoinsProps {
  toolCallId: string;
  toolInvocation: AIToolInvocation & {
    result?: any;
    args?: {
      result?: any;
      [key: string]: any;
    };
    toolInvocations?: Array<{
      args?: {
        result?: any;
        [key: string]: any;
      };
      result?: any;
      state: string;
      toolName: string;
      [key: string]: any;
    }>;
  };
}

export interface GlobalMarketProps {
  toolCallId: string;
  toolInvocation: {
    state: string;
    result?: GlobalMarketData;
  };
  className?: string;
}

export interface DerivativesExchangesProps extends BaseToolProps {
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    result?: Record<string, Exchange>;
    state: ToolInvocationState;
  };
}

export interface TradingViewChartProps {
  symbol: string;
  interval?: string;
  theme?: 'light' | 'dark';
  className?: string;
}

export interface TechnicalAnalysisProps {
  className?: string;
  symbol?: string;
}

export interface StockAnalysisProps extends BaseToolProps {
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    result?: {
      symbol: string;
      price: number;
      change: number;
      changePercent: number;
      volume: number;
      marketCap: number;
      peRatio: number;
      analysis: {
        technicalIndicators: Record<string, any>;
        fundamentalMetrics: Record<string, any>;
        recommendation: string;
      };
    };
    state: ToolInvocationState;
  };
  append?: (message: string) => void;
}

export interface RecentCoinsMessage {
  role: string;
  toolInvocations?: {
    result: CoinData[];
  }[];
}

export interface ExtendedBrowserUseResultProps extends TaskProps {
  toolCallId: string;
  toolInvocation: any;
}

export type FilterType = 'all' | 'templates' | 'custom';

// Re-export common UI types
export type { TokenIconProps, CopyButtonProps, AccordionProps, ImageSelectProps };

export type KnowledgeEntry = {
  id: string;
  fileName?: string;
  fileType?: string;
  url?: string;
  title?: string;
  textPreview?: string;
  type?: string; // 'file', 'url', or 'text'
  uploadedAt: string;
  metadata: Record<string, any>;
  vectorCount: number;
};

export interface QuoteSwapProps extends BaseComponentProps {
  toolInvocation: ToolInvocationBase & {
    result?: {
      quote: any;
    };
  };
} 