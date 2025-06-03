export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: {
    large: string;
    thumb?: string;
  };
  thumb?: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  marketCapRank?: number;
  price_change_percentage_24h: number;
  sparkline_in_7d?: {
    price: number[];
  };
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
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    market_cap: { usd: number };
    total_volume: { usd: number };
    circulating_supply: number;
    total_supply: number | null;
  };
  links: {
    homepage: string[];
    twitter_screen_name: string;
  };
  last_updated: string;
  platforms?: Record<string, string>;
  holder_stats?: {
    statistics: {
      avg_time_held: number;
      retention_rate: number;
    };
    breakdown: {
      total_holders: number;
      holders_over_100k_usd: number;
      holders_over_10000_usd: number;
    };
    deltas: {
      '7days': number;
      '14days': number;
      '30days': number;
    };
  };
}

export interface TrendingCoinsProps {
  toolCallId: string;
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    result?: Record<string, Coin>;
    state: string;
  };
}

export interface SortableColumn {
  key: keyof Coin;
  label: string;
  sortable: boolean;
} 