import { Token } from './wallet';
import { ChartData, TradingViewConfig } from './chart';
import { BaseToolProps, ToolInvocationState } from './tools';

export type Strategy = 'dca' | 'momentum' | 'limit' | 'rebalance';

export interface StrategyConfig {
  name: string;
  description: string;
  icon: string;
  frequency: 'hourly' | 'daily' | 'weekly';
  frequency_options: string[];
  amount: number;
  target_token: string;
}

export interface SwapToolResult {
  fromToken: Token;
  toToken: Token;
  fromAmount: number;
  toAmount: number;
  slippage: number;
  priceImpact: number;
  routeInfo?: any;
}

export interface SwapToolInvocation {
  type: 'swap';
  params: {
    fromToken: Token;
    toToken: Token;
    amount: number;
    slippage: number;
  };
  result?: SwapToolResult;
}

export interface PaginatedTokens {
  tokens: Token[];
  hasMore: boolean;
  total: number;
  page: number;
}

export type SelectionType = 'from' | 'to' | null;

export interface TradingViewResult extends TradingViewConfig {}

export interface OptionsAnalysisProps extends BaseToolProps {
  toolInvocation: {
    toolName: string;
    args: { message: string };
    result?: {
      current_price: number;
      options_sentiment: {
        call_put_ratio: number;
        implied_volatility: number;
        volume_trend: string;
      };
      chain_data: {
        atm_call_iv: number;
        atm_put_iv: number;
        call_put_ratio: number;
      };
    };
    state: ToolInvocationState;
  };
}

export type { ChartData }; 