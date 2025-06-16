import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { ProxyConnection, getSolanaConnection } from './solana';
import VaultImpl from '@meteora-ag/vault-sdk';
import BN from 'bn.js';

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

// Initialize connection
const connection = getSolanaConnection();

export interface VaultInfo {
  address: string;
  tokenA: string;
  tokenB: string;
  tvl: number;
  apy: number;
}

export class MeteoraVault {
  private vault: VaultImpl | null;
  private tokenA: PublicKey | null;
  private tokenB: PublicKey | null;

  constructor(vaultAddress: PublicKey) {
    this.vault = null;
    this.tokenA = null;
    this.tokenB = null;
  }

  async initialize(tokenAddress: string): Promise<void> {
    try {
      console.log('Initializing vault with token address:', tokenAddress);
      
      // Validate token address
      this.tokenA = new PublicKey(tokenAddress);

      // Create vault instance
      console.log('Creating vault instance...');
      this.vault = await VaultImpl.create(connection, this.tokenA);

      // Verify vault was created successfully
      if (!this.vault) {
        throw new Error('Failed to create vault instance');
      }

      // Get token pair information from vault state
      console.log('Refreshing vault state...');
      await this.vault.refreshVaultState();
      
      // Get the second token from the vault state
      const vaultState = this.vault.vaultState;
      if (!vaultState) {
        throw new Error('Invalid vault state');
      }
      
      this.tokenB = vaultState.tokenVault;
      console.log('Vault initialized successfully with token B:', this.tokenB.toBase58());
    } catch (error: unknown) {
      console.error('Error initializing vault:', error);
      throw error;
    }
  }

  async getVaultInfo(): Promise<VaultInfo> {
    try {
      if (!this.vault) {
        throw new Error('Vault not initialized');
      }

      // Refresh vault state
      await this.vault.refreshVaultState();

      // Get TVL from vault state
      const vaultState = this.vault.vaultState;
      if (!vaultState) {
        throw new Error('Invalid vault state');
      }

      const tvl = vaultState.totalAmount?.toNumber() || 0;

      // Fetch APY from Meteora API using token mints
      const tokenA = this.tokenA!.toBase58();
      const tokenB = this.tokenB!.toBase58();
      console.log('Looking up APY for tokens:', tokenA, tokenB);
      const pair = await getPairByTokens(tokenA, tokenB);
      console.log('Pair found:', pair);
      const apy = pair ? pair.apy_24h : 0;
      console.log('APY for vault:', apy);

      return {
        address: this.vault.vaultPda.toBase58(),
        tokenA,
        tokenB,
        tvl,
        apy
      };
    } catch (error: unknown) {
      console.error('Error getting vault info:', error);
      throw error;
    }
  }

  async deposit(amount: number, walletAddress: string): Promise<Transaction> {
    try {
      if (!this.vault) {
        throw new Error('Vault not initialized');
      }

      const walletPubkey = new PublicKey(walletAddress);

      // Create deposit transaction
      const tx = await this.vault.deposit(
        walletPubkey,
        new BN(amount)
      );

      return tx;
    } catch (error: unknown) {
      console.error('Error creating deposit transaction:', error);
      throw error;
    }
  }

  async withdraw(amount: number, walletAddress: string): Promise<Transaction> {
    try {
      if (!this.vault) {
        throw new Error('Vault not initialized');
      }

      const walletPubkey = new PublicKey(walletAddress);

      // Create withdraw transaction
      const tx = await this.vault.withdraw(
        walletPubkey,
        new BN(amount)
      );

      return tx;
    } catch (error: unknown) {
      console.error('Error creating withdraw transaction:', error);
      throw error;
    }
  }

  async getUserPosition(userAddress: string): Promise<number> {
    try {
      if (!this.vault) {
        throw new Error('Vault not initialized');
      }

      const userPubkey = new PublicKey(userAddress);
      const balance = await this.vault.getUserBalance(userPubkey);
      return balance.toNumber();
    } catch (error: unknown) {
      console.error('Error getting user position:', error);
      throw error;
    }
  }
}

export async function getVault(vaultAddress: string): Promise<MeteoraVault> {
  return new MeteoraVault(new PublicKey(vaultAddress));
}

export async function deriveVaultAddress(tokenA: string, tokenB: string): Promise<string> {
  try {
    console.log('Deriving vault address for tokens:', { tokenA, tokenB });
    
    // Validate token addresses
    if (!tokenA || !tokenB) {
      throw new Error('Token addresses are required');
    }

    try {
      const tokenAPubkey = new PublicKey(tokenA);
      const tokenBPubkey = new PublicKey(tokenB);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Invalid token address format: ${error.message}`);
      }
      throw new Error('Invalid token address format');
    }

    // Call the API endpoint to derive the vault address
    const response = await fetch(`/api/vault/derive?tokenA=${tokenA}&tokenB=${tokenB}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to derive vault address');
    }

    const data = await response.json();
    return data.address;
  } catch (error: unknown) {
    console.error('Error in deriveVaultAddress:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to derive vault address: ${error.message}`);
    }
    throw new Error('Failed to derive vault address');
  }
}

export async function getPairByTokens(tokenA: string, tokenB: string) {
  const params = {
    include_token_mints: [tokenA, tokenB].join(','),
    limit: 10
  };
  const result = await makeMeteoraRequest<any>('/pair/all_by_groups', params);
  // Flatten all pairs from all groups
  const allPairs = Array.isArray(result.groups)
    ? result.groups.flatMap((g: any) => g.pairs || [])
    : [];
  if (!allPairs.length) {
    console.warn('No pairs found for tokens', tokenA, tokenB, 'API result:', result);
    return undefined;
  }
  // Find the pair that matches both tokens (order may matter)
  return allPairs.find(
    (p: any) =>
      p &&
      p.token_x && p.token_y &&
      (
        (p.token_x.address === tokenA && p.token_y.address === tokenB) ||
        (p.token_x.address === tokenB && p.token_y.address === tokenA)
      )
  );
} 