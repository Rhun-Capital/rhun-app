export interface PortfolioMetrics {
  totalValue: number;
  totalChange24h: number;
  changePercentage24h: number;
  totalTokens?: number;
  topHoldings?: {
    token: string;
    value: number;
    percentage: number;
  }[];
}

export interface TechnicalAnalysisItem {
  indicator: string;
  value: number;
  signal: 'buy' | 'sell' | 'neutral';
  description: string;
}

export interface FundamentalAnalysisItem {
  metric: string;
  assessment: 'positive' | 'negative' | 'neutral';
  description: string;
}

export interface WhaleData {
  address: string;
  value: number;
  tokens: {
    symbol: string;
    amount: number;
    value: number;
  }[];
  lastActivity: string;
}

export interface FredMetadata {
  id: string;
  title: string;
  frequency: string;
  units: string;
  seasonal_adjustment: string;
  last_updated: string;
  notes?: string;
}

export interface NftData {
  collection: string;
  floorPrice: number;
  volume24h: number;
  holders: number;
  totalSupply: number;
  marketCap: number;
  imageUrl?: string;
}

export interface TechnicalAnalysisProps {
  data: {
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
  };
}

export interface IndicatorAnalysis {
  status: 'bullish' | 'bearish' | 'neutral';
  summary: string;
  details: string[];
} 