import { z } from 'zod';

// Types for Meteora DLMM API responses
export interface ProtocolMetrics {
  total_tvl: number;
  daily_trade_volume: number;
  total_trade_volume: number;
  daily_fee: number;
  total_fee: number;
}

export interface PairInfo {
  address: string;
  token_x: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
  };
  token_y: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
  };
  bin_step: number;
  active_id: number;
  fee_bps: number;
  protocol_fee_bps: number;
  total_liquidity: number;
  total_volume_24h: number;
  total_fee_24h: number;
  apr_24h: number;
  apy_24h: number;
}

export interface AllGroupOfPairs {
  pairs: PairInfo[];
  total: number;
  page: number;
  limit: number;
}

// API endpoints
const BASE_URL = 'https://dlmm-api.meteora.ag';

// Helper function to make API requests
async function makeMeteoraRequest<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Meteora API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// API functions
export async function getProtocolMetrics(): Promise<ProtocolMetrics> {
  return makeMeteoraRequest<ProtocolMetrics>('/info/protocol_metrics');
}

export async function getAllPairs(includeUnknown: boolean = true): Promise<PairInfo[]> {
  return makeMeteoraRequest<PairInfo[]>('/pair/all', { include_unknown: includeUnknown });
}

export async function getAllPairsByGroups(params: {
  page?: number;
  limit?: number;
  skip_size?: number;
  pools_to_top?: string[];
  sort_key?: string;
  order_by?: 'asc' | 'desc';
  search_term?: string;
  include_unknown?: boolean;
  hide_low_tvl?: number;
  hide_low_apr?: boolean;
  include_token_mints?: string[];
  include_pool_token_pairs?: string[];
  tags?: string[];
}): Promise<AllGroupOfPairs> {
  return makeMeteoraRequest<AllGroupOfPairs>('/pair/all_by_groups', params);
}

// Helper function to format numbers
export function formatNumber(num: number): string {
  if (Math.abs(num) >= 1000000000) {
    return `${(num / 1000000000).toFixed(2)}B`;
  }
  if (Math.abs(num) >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  }
  if (Math.abs(num) >= 1000) {
    return `${(num / 1000).toFixed(2)}K`;
  }
  return num.toFixed(2);
}

// Helper function to format APR/APY
export function formatAPR(apr: number): string {
  return `${apr.toFixed(2)}%`;
} 