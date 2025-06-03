import type { ToolInvocation as AIToolInvocation } from '@ai-sdk/ui-utils';

export interface DexScreenerToken {
  address: string;
  name: string;
  symbol: string;
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
    m5?: { buys: number; sells: number };
    h1?: { buys: number; sells: number };
    h6?: { buys: number; sells: number };
    h24?: { buys: number; sells: number };
  };
  volume: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  priceChange: {
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: {
    imageUrl?: string;
    header?: string;
    openGraph?: string;
    websites?: { url: string }[];
    socials?: { platform: string; handle: string }[];
  };
}

export interface RecentDexScreenerProps {
  toolCallId: string;
  toolInvocation: AIToolInvocation & {
    result?: DexScreenerPair[];
    args?: {
      result?: DexScreenerPair[];
      chainId?: string;
      [key: string]: any;
    };
    toolInvocations?: Array<{
      args?: {
        result?: DexScreenerPair[];
        chainId?: string;
        [key: string]: any;
      };
      result: any;
      state: string;
      toolName: string;
      [key: string]: any;
    }>;
  };
} 