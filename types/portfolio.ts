export interface PortfolioMetrics {
  totalValue: number;
  totalValueChange24h: number;
  totalValueChange7d: number;
  totalValueChange30d: number;
  totalChange24h: number;
  changePercentage24h: number;
  topHoldings: {
    symbol: string;
    value: number;
    percentage: number;
  }[];
  riskScore: number;
  diversificationScore: number;
  volatilityScore: number;
}

export interface PortfolioValueProps {
  address: string;
  onValueUpdate?: (value: number) => void;
  className?: string;
}

export interface PortfolioHolding {
  token: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
  };
  balance: string;
  value: number;
  valueChange24h: number;
  valueChangePercent24h: number;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  allocation: number;
  transactions: {
    buys: number;
    sells: number;
    transfers: number;
  };
  costBasis: {
    average: number;
    total: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
  };
}

export interface PortfolioTransaction {
  hash: string;
  timestamp: string;
  type: 'buy' | 'sell' | 'transfer' | 'swap';
  token: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  amount: string;
  value: number;
  price: number;
  from: string;
  to: string;
  fee: {
    amount: string;
    value: number;
  };
  status: 'confirmed' | 'pending' | 'failed';
  metadata?: Record<string, any>;
}

export interface PortfolioHistory {
  timestamp: string;
  totalValue: number;
  holdings: {
    token: string;
    balance: string;
    value: number;
    price: number;
  }[];
}

export interface PortfolioAnalysis {
  metrics: PortfolioMetrics;
  holdings: PortfolioHolding[];
  transactions: PortfolioTransaction[];
  history: PortfolioHistory[];
  recommendations: {
    type: 'rebalance' | 'diversify' | 'reduce_risk' | 'take_profit';
    description: string;
    actions: {
      type: 'buy' | 'sell' | 'swap';
      token: string;
      amount: string;
      reason: string;
    }[];
  }[];
} 