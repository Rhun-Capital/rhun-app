import { Message } from './chat';
import { TokenDisplayMetadata, Token, TokenData } from './token';
import { GlobalMarketData, WhaleActivityResult } from './market';
import { Category } from './market';
import { AccountData } from './account';
import { TaskProps } from './task';
import { BrowserUseResultProps } from './components';
import { MarketData } from './market';

export interface Tool {
  name: string;
  description: string;
  command: string;
  isPro?: boolean;
  isNew?: boolean;
  requiresAuth: boolean;
}

export interface ToolResult {
  type: string;
  data: any;
}

export type ToolInvocationState = 'call' | 'partial-call' | 'result';

export interface ToolInvocationBase {
  toolName: string;
  args: Record<string, any>;
  result?: any;
  state: ToolInvocationState;
}

export interface BaseToolProps {
  toolCallId: string;
  toolInvocation: ToolInvocationBase;
  className?: string;
}

export interface ToolResultInvocation extends ToolInvocationBase {
  state: 'result';
}

export interface ToolPartialInvocation extends ToolInvocationBase {
  state: 'partial-call';
}

export interface ToolCallInvocation extends ToolInvocationBase {
  state: 'call';
}

export type CustomToolInvocation = ToolResultInvocation | ToolPartialInvocation | ToolCallInvocation;

export interface SwapToolResult {
  fromToken: string;
  toToken: string;
  amount: number;
  expectedOutput: number;
}

export interface SwapToolInvocation extends ToolInvocationBase {
  result?: SwapToolResult;
}

export interface UpdateToolInvocationParams {
  id: string;
  state: ToolInvocationState;
  result?: any;
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

export interface Exchange {
  id: string;
  name: string;
  year_established: number | null;
  country: string | null;
  description: string;
  url: string;
  image: string;
  has_trading_incentive: boolean;
  trust_score: number;
  trust_score_rank: number;
  trade_volume_24h_btc: number;
  trade_volume_24h_btc_normalized: number;
  open_interest_btc: number;
  number_of_perpetual_pairs: number;
  number_of_futures_pairs: number;
}

export interface AIToolInvocation extends ToolInvocationBase {
  toolInvocations?: Array<{
    args?: {
      result?: any;
      [key: string]: any;
    };
    result?: any;
    state: string;
    toolName: string;
  }>;
}

export interface TokenToolInvocation {
  toolName: string;
  args: { message: string };
  result?: TokenData | { error: string };
}

export interface WhaleActivityToolInvocation {
  result?: WhaleActivityResult;
}

export interface ResultToolInvocation extends ToolInvocationBase {
  state: 'result';
  result: any;
}

export interface PartialCallToolInvocation extends ToolInvocationBase {
  state: 'partial-call';
  result?: any;
}

export type ToolInvocationResult = ResultToolInvocation | PartialCallToolInvocation;

export interface TaskData {
  id: string;
  status: string;
  result?: any;
  error?: string;
  created_at: string;
  updated_at: string;
}

export type PartialTaskData = Partial<TaskData>;

export interface ExtendedBrowserUseResultProps extends BrowserUseResultProps {
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    result?: TaskData;
    state: ToolInvocationState;
  };
}

export interface FilterState {
  startTime: string;
  endTime: string;
  activityTypes: string[];
  from: string;
  platforms: string[];
  sources: string[];
  token: string;
}

export interface OnChainData {
  attributes?: {
    address: string;
    name?: string;
    symbol?: string;
    image_url?: string;
    price_usd?: string;
    market_cap_usd?: string;
    volume_usd?: {
      h24: string;
    };
    total_supply?: string;
    total_reserve_in_usd?: string;
  };
}

export interface HolderStats {
  statistics?: {
    avg_time_held: number;
    retention_rate: number;
  };
  breakdown?: {
    total_holders: number;
    holders_over_100k_usd: number;
    holders_over_10000_usd: number;
  };
  deltas?: {
    [key: string]: number;
  };
}

export interface TokenInfoData {
  market?: MarketData;
  onchain?: OnChainData;
  status?: string;
  holder_stats?: HolderStats;
}

export interface ToolInvocation {
  toolName: string;
  args: { message: string };
  result?: any;
}

export interface Tweet {
  id: string;
  text: string;
  created_at: string;
  author?: {
    username: string;
    verified?: boolean;
  };
  investor_metrics: {
    engagement_rate: number;
    viral_score: number;
    discussion_ratio: number;
    influence_weight: number;
    credibility_score: number;
    total_engagement: number;
  };
}

export interface TwitterMetrics {
  total_tweets: number;
  total_engagement: number;
  avg_engagement_rate: number;
  avg_viral_score: number;
  avg_discussion_ratio: number;
  avg_credibility_score: number;
  high_engagement_count: number;
  viral_tweets_count: number;
  high_discussion_count: number;
  sentiment_indicators: {
    buzz_level: 'high' | 'medium' | 'low';
    viral_potential: 'high' | 'low';
    discussion_intensity: 'high' | 'medium';
  };
}

export interface TwitterData {
  data: Tweet[];
  aggregate_metrics: TwitterMetrics;
} 