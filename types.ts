export interface TokenHolding {
    mint: string;
    amount: number;
    usdValue: number;
    priceChange24h: number;
    symbol: string;
    volume24h?: number;
    logoURI?: string;
    name: string;
  }
  