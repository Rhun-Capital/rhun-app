import { TokenDisplayMetadata } from './token';
import { BaseToolProps, ToolInvocationState } from './tools';

export interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: {
    large: string;
  };
  price: number;
  priceChange24h: number;
  priceChange7d: number;
  priceChange30d: number;
  current_price: number;
  market_cap: number;
  marketCap: number;
  totalVolume: number;
  circulatingSupply: number;
  totalSupply: number | null;
  description?: {
    en: string;
  };
  platforms?: Record<string, string>;
  lastUpdated: string;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  roi: {
    times: number;
    currency: string;
    percentage: number;
  } | null;
  last_updated: string;
}

export interface DetailedCoinData {
  id: string;
  symbol: string;
  name: string;
  description: { en: string };
  platforms: Record<string, string>;
  contracts: Record<string, { decimal_place: number | null; contract_address: string }>;
  market_data: {
    current_price: { usd: number };
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    market_cap: { usd: number };
    total_volume: { usd: number };
    circulating_supply: number;
    total_supply: number;
    high_24h: { usd: number };
    low_24h: { usd: number };
  };
  image: {
    large: string;
  };
  links: {
    homepage: string[];
    twitter_screen_name: string;
  };
  last_updated: string;
}

export interface MarketData {
  name: string;
  symbol: string;
  image: string;
  marketCap: number;
  currentPrice: number;
  priceChange24h: number;
  totalVolume: number;
  circulatingSupply: number;
  totalSupply: number;
  description: string;
  lastUpdated: string;
  homePage: string;
  twitter: string;
}

export interface OnChainData {
  holders: number;
  transfers: number;
  active_wallets: number;
  total_transactions: number;
  contract_transactions: number;
  token_transactions: number;
  token_holders: number;
  token_transfers: number;
  token_decimals: number;
  token_total_supply: string;
  token_circulating_supply: string;
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
    amount1_adjusted?: number;
    amount2_adjusted?: number;
  };
  time: string;
  from_address: string;
  platform: string[];
  sources: string[];
}

export interface ActivityResponse {
  data: Activity[];
  metadata: {
    tokens: { [key: string]: TokenDisplayMetadata };
  };
}

export interface Category {
  id: string;
  name: string;
  marketCap: number;
  volume24h: number;
  topCoins: string[];
  change24h: number;
}

export interface IndicatorAnalysis {
  status: 'bullish' | 'bearish' | 'neutral';
  summary: string;
  details: string[];
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
    state: ToolInvocationState;
  };
}

export interface WhaleAnalysisProps extends BaseToolProps {
  toolInvocation: {
    toolName: string;
    args: { message: string };
    result?: {
      whales: Array<{
        address: string;
        entryPrice: number;
        currentPrice: number;
        profitLossPercent: number;
        totalValue: number;
        tokenAmount: number;
        lastTradeTimestamp: number;
      }>;
    };
    state: ToolInvocationState;
  };
}

export interface WhaleData {
  address: string;
  entryPrice: number;
  currentPrice: number;
  profitLossPercent: number;
  totalValue: number;
  tokenAmount: number;
  lastTradeTimestamp: number;
  balance?: number;
  value?: number;
  lastActivity?: string;
  transactions?: {
    count: number;
    volume: number;
  };
  tokens?: {
    count: number;
    topHoldings: {
      symbol: string;
      balance: number;
      value: number;
    }[];
  };
  analytics?: {
    profitLoss: number;
    holdingPeriod: number;
    tradingVolume: number;
    averagePosition: number;
  };
}

export interface WhaleTransaction {
  hash: string;
  type: 'buy' | 'sell';
  timestamp: number;
  amount: number;
  token: string;
  from: string;
  to: string;
  explorerUrl: string;
}

export interface WhaleActivityResult {
  transactions: WhaleTransaction[];
}

export interface GlobalMarketData {
  totalMarketCap: number;
  totalVolume: number;
  marketCapPercentage: {
    [key: string]: number;
  };
  marketCapChange24h: number;
  activeCryptocurrencies: number;
  lastUpdated: number;
}

export interface CoinDetails {
  id: string;
  symbol: string;
  name: string;
  description: { en: string };
  platforms: Record<string, string>;
  contracts: Record<string, { decimal_place: number | null; contract_address: string }>;
  market_data: {
    current_price: { usd: number };
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    market_cap: { usd: number };
    total_volume: { usd: number };
    circulating_supply: number;
    total_supply: number;
    high_24h: { usd: number };
    low_24h: { usd: number };
  };
  image: {
    large: string;
  };
  links: {
    homepage: string[];
    twitter_screen_name: string;
  };
  last_updated: string;
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
  chainId: number;
  logoURI?: string;
}

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
  total: number;
}

export interface Coin {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
  large: string;
  score: number;
  price_btc: number;
  price_change_percentage_24h?: number;
}

export interface CoinDetail extends Coin {
  description: {
    en: string;
  };
  market_data: {
    current_price: {
      usd: number;
    };
    price_change_percentage_24h: number;
  };
}

export interface DexScreenerToken {
  name: string;
  symbol: string;
  address: string;
}

export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: DexScreenerToken;
  quoteToken: DexScreenerToken;
  priceNative: string;
  priceUsd: string;
  txns: {
    h24: {
      buys: number;
      sells: number;
    };
  };
  volume: {
    h24: number;
  };
  priceChange: {
    h24: number;
  };
  liquidity?: {
    usd: number;
  };
  fdv?: number;
  pairCreatedAt?: number;
}

export interface NftData {
  collectionName: string;
  floorPrice: number;
  volume24h: number;
  volumeChange24h: number;
  holders: number;
  sales24h: number;
  marketCap: number;
  imageUrl?: string;
  description?: string;
  website?: string;
  twitter?: string;
  discord?: string;
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

export interface SwapQuote {
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

export interface TechnicalAnalysisData {
  symbol: string;
  name?: string;
  currentPrice: number;
  image?: string;
  priceChange: {
    '24h': number;
    '7d': number;
    '30d': number;
  };
  technicalIndicators: {
    sma: {
      '20': number;
      '50': number;
      '200': number;
    };
    ema: {
      '9': number;
      '21': number;
      '50': number;
    };
    rsi: number;
    macd: {
      macd: number;
      signal: number;
      histogram: number;
    };
    stochRSI: number;
    cci: number;
    mfi: number;
    adx: number;
    dmi: {
      plus: number;
      minus: number;
    };
    ichimoku: {
      tenkan: number;
      kijun: number;
      senkouA: number;
      senkouB: number;
    };
    aroon: {
      up: number;
      down: number;
    };
    bollingerBands: {
      upper: number;
      middle: number;
      lower: number;
    };
    atr: number;
    volume: {
      volume: number;
      volumeSMA: number;
      volumeEMA: number;
    };
    obv: number;
    pivotPoints: {
      pivot: number;
      r1: number;
      r2: number;
      s1: number;
      s2: number;
    };
    fibonacciRetracement: {
      level0: number;
      level236: number;
      level382: number;
      level500: number;
      level618: number;
      level100: number;
    };
  };
  supportResistance: {
    support: number[];
    resistance: number[];
  };
  marketSentiment: {
    trend: string;
    strength: number;
    confidence: number;
  };
  lastUpdated: string;
  analysisPeriod: {
    days: number;
  };
}

export interface TechnicalAnalysisProps {
  data: TechnicalAnalysisData;
  className?: string;
  symbol?: string;
}

export interface MarketMoversProps {
  toolCallId: string;
  toolInvocation: {
    toolName: string;
    args: { message: string };
    result?: {
      top_gainers: CoinData[];
      top_losers: CoinData[];
    };
  };
}

export interface MarketCategoriesProps {
  toolCallId: string;
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    result?: Record<string, Category>;
    state: 'call' | 'partial-call' | 'result';
  };
}

export interface GlobalMarketProps {
  toolCallId: string;
  toolInvocation: {
    toolName: string;
    args: { message: string };
    result?: GlobalMarketData;
  };
  refreshInterval?: number;
  className?: string;
}

export interface RecentCoinsProps {
  toolCallId: string;
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    result?: Record<string, CoinData>;
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
      timestamp?: string;
    };
  };
}

export interface TableColumn {
  header: string;
  accessorKey: keyof CoinData;
  cell: (data: CoinData) => React.ReactNode;
  sortable?: boolean;
}

export interface SortableColumn {
  key: keyof Coin;
  label: string;
  sortable: boolean;
}

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

export interface RecentDexScreenerProps {
  toolCallId: string;
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    result?: {
      pairs: DexScreenerPair[];
    };
  };
}

export interface TradingViewChartProps {
  toolCallId: string;
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    result?: any;
  };
  interval?: string;
  theme?: 'light' | 'dark';
  className?: string;
}

export interface StockAnalysisProps {
  toolCallId: string;
  toolInvocation: {
    result?: any;
  };
  append?: (message: any, options?: any) => Promise<string | null | undefined>;
  className?: string;
}

export interface SolanaTransactionVolumeData {
  totalVolume: number;
  buyVolume: number;
  sellVolume: number;
  transactionCount: number;
  averageTransactionSize: number;
  volumeChange24h: number;
  lastUpdated: number;
}

export interface SolanaTransactionVolumeProps {
  toolCallId: string;
  toolInvocation: {
    result?: SolanaTransactionVolumeData;
  };
}

export interface BalanceProps {
  className?: string;
  address?: string;
}

export interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  amount: number;
  price: number;
  value: number;
}

export interface BalanceData {
  totalBalance: number;
  tokens: TokenBalance[];
  lastUpdated: number;
}

export interface BalanceProps {
  toolCallId: string;
  toolInvocation: {
    result?: BalanceData;
  };
}

export interface TrendingCoinsProps extends BaseToolProps {
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    result?: {
      coins: Array<{
        id: string;
        name: string;
        symbol: string;
        thumb: string;
        price_usd: number;
        market_cap_rank: number;
        price_change_percentage_24h: number;
        market_cap: number;
        total_volume: string;
        sparkline?: string;
        content_description?: string;
      }>;
    };
    state: ToolInvocationState;
  };
}

export interface TrendingSearchCoin {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
  large: string;
  score: number;
  price_btc: number;
  price_change_percentage_24h?: number;
}

export interface TrendingSearchSortableColumn {
  key: keyof TrendingSearchCoin;
  label: string;
  sortable: boolean;
}

export interface MarketInfo {
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
}

export interface TopHoldersDisplayProps extends BaseToolProps {
  toolInvocation: {
    toolName: string;
    args: { message: string };
    result?: {
      holders: Array<{
        address: string;
        balance: number;
        percentage: number;
        value: number;
        rank: number;
      }>;
      token: {
        symbol: string;
        name: string;
        totalSupply: number;
        decimals: number;
      };
    };
    state: ToolInvocationState;
  };
} 