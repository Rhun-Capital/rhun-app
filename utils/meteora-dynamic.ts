import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import { getSolanaConnection } from './solana';
import DLMM, { StrategyType, autoFillYByStrategy } from '@meteora-ag/dlmm';
import BN from 'bn.js';

// New DLMM program ID
const DLMM_PROGRAM_ID = 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo';

export interface StablePoolInfo {
  poolAddress: string;
  tokenA: {
    address: string;
    symbol: string;
    decimals: number;
  };
  tokenB: {
    address: string;
    symbol: string;
    decimals: number;
  };
  tvl: number;
  apy: number;
}

export interface PositionParams {
  walletAddress: PublicKey;
  totalXAmount: BN;
  totalYAmount?: BN;
  strategy: 'spot' | 'bidask' | 'curve';
  binRange: number; // Number of bins on each side of active bin
  autoFill: boolean; // Whether to auto-calculate Y amount
}

export class MeteoraDynamicPool {
  private connection: Connection;
  private poolAddress: PublicKey;
  private pool: DLMM | null = null;
  private tokenA: PublicKey | null = null;

  constructor(poolAddress: string) {
    this.connection = getSolanaConnection();
    this.poolAddress = new PublicKey(poolAddress);
  }

  get address(): string {
    return this.poolAddress.toBase58();
  }

  async initialize(tokenAddress: string): Promise<void> {
    try {
      // Validate token address
      this.tokenA = new PublicKey(tokenAddress);
      
      // Get the existing DLMM pool instance
      this.pool = await DLMM.create(this.connection, this.poolAddress);
      console.log('DLMM Pool loaded successfully');
    } catch (error) {
      console.error('Error loading DLMM pool:', error);
      throw error;
    }
  }

  async getPoolInfo(): Promise<StablePoolInfo> {
    if (!this.pool) {
      throw new Error('Pool not initialized. Call initialize() first.');
    }

    if (!this.tokenA) {
      throw new Error('Token A not initialized. Call initialize() first.');
    }

    try {
      const activeBin = await this.pool.getActiveBin();
      const lbPair = this.pool.lbPair;

      return {
        poolAddress: this.poolAddress.toBase58(),
        tokenA: {
          address: lbPair.tokenXMint.toBase58(),
          symbol: 'RHUN',
          decimals: 6,
        },
        tokenB: {
          address: lbPair.tokenYMint.toBase58(),
          symbol: 'SOL',
          decimals: 9,
        },
        tvl: 0, // TODO: Calculate TVL from bin data
        apy: 0, // TODO: Calculate APY
      };
    } catch (error) {
      console.error('Error getting DLMM pool info:', error);
      throw error;
    }
  }

  async getActiveBin() {
    if (!this.pool) {
      throw new Error('Pool not initialized. Call initialize() first.');
    }

    return await this.pool.getActiveBin();
  }

  async createPosition(params: PositionParams): Promise<{ transaction: Transaction; positionKeypair: Keypair }> {
    if (!this.pool) {
      throw new Error('Pool not initialized. Call initialize() first.');
    }

    try {
      const activeBin = await this.pool.getActiveBin();
      
      // Calculate bin range
      const minBinId = activeBin.binId - params.binRange;
      const maxBinId = activeBin.binId + params.binRange;

      // Convert strategy string to StrategyType enum
      let strategyType: StrategyType;
      switch (params.strategy) {
        case 'spot':
          strategyType = StrategyType.Spot;
          break;
        case 'bidask':
          strategyType = StrategyType.BidAsk;
          break;
        case 'curve':
          strategyType = StrategyType.Curve;
          break;
        default:
          strategyType = StrategyType.Spot;
      }

      // Calculate Y amount if auto-fill is enabled
      let totalYAmount = params.totalYAmount || new BN(0);
      if (params.autoFill && !params.totalYAmount) {
        totalYAmount = autoFillYByStrategy(
          activeBin.binId,
          this.pool.lbPair.binStep,
          params.totalXAmount,
          activeBin.xAmount,
          activeBin.yAmount,
          minBinId,
          maxBinId,
          strategyType
        );
      }

      // Generate new position keypair
      const positionKeypair = new Keypair();

      // Create position transaction
      const createPositionTx = await this.pool.initializePositionAndAddLiquidityByStrategy({
        positionPubKey: positionKeypair.publicKey,
        user: params.walletAddress,
        totalXAmount: params.totalXAmount,
        totalYAmount: totalYAmount,
        strategy: {
          maxBinId,
          minBinId,
          strategyType,
        },
      });

      // Handle both single transaction and array of transactions
      const transaction = Array.isArray(createPositionTx) ? createPositionTx[0] : createPositionTx;

      return {
        transaction,
        positionKeypair
      };
    } catch (error) {
      console.error('Error creating DLMM position:', error);
      throw error;
    }
  }

  async depositSingleSided(
    walletAddress: PublicKey,
    amount: number,
    slippage: number = 1
  ): Promise<Transaction> {
    // This method is deprecated for DLMM - use createPosition instead
    throw new Error('Use createPosition() method for DLMM pools instead of depositSingleSided()');
  }

  async withdraw(
    walletAddress: PublicKey,
    amount: number,
    slippage: number = 1
  ): Promise<Transaction> {
    // This method is deprecated for DLMM - use position management instead
    throw new Error('Use position management methods for DLMM pools instead of withdraw()');
  }
}

export function getStablePool(poolAddress: string): MeteoraDynamicPool {
  return new MeteoraDynamicPool(poolAddress);
}

export async function createPool(tokenA: string, tokenB: string): Promise<string> {
  try {
    const response = await fetch('/api/pool/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tokenA,
        tokenB,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create pool');
    }

    const data = await response.json();
    return data.poolAddress;
  } catch (error) {
    console.error('Error creating pool:', error);
    throw error;
  }
} 