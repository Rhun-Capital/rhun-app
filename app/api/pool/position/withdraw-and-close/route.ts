import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';
import { getSolanaConnection } from '@/utils/solana';
import BN from 'bn.js';

const POOL_ADDRESS = '2jxVjkPignEbR5pbGNtiRyCc6fAKZTKuFTf1MQED9pt5';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, positionAddress } = body;

    if (!walletAddress || !positionAddress) {
      return NextResponse.json({ error: 'Wallet address and position address are required' }, { status: 400 });
    }

    console.log('Withdrawing and closing position:', positionAddress, 'for wallet:', walletAddress);

    // Initialize DLMM pool
    const connection = getSolanaConnection();
    const poolPubkey = new PublicKey(POOL_ADDRESS);
    const dlmmPool = await DLMM.create(connection, poolPubkey);
    
    // Get user pubkey and position pubkey
    const userPubkey = new PublicKey(walletAddress);
    const positionPubkey = new PublicKey(positionAddress);

    // Get the user's positions to find the specific position object
    const { userPositions } = await dlmmPool.getPositionsByUserAndLbPair(userPubkey);
    const targetPosition = userPositions.find(pos => pos.publicKey.equals(positionPubkey));

    if (!targetPosition) {
      return NextResponse.json({
        success: false,
        error: 'Position not found for this wallet'
      }, { status: 404 });
    }

    // Get position data to determine bin IDs for removal
    const positionData = targetPosition.positionData;
    const binIdsToRemove = positionData.positionBinData.map(bin => bin.binId);
    
    if (binIdsToRemove.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No liquidity bins found in position'
      }, { status: 400 });
    }

    console.log(`Found ${binIdsToRemove.length} bins to remove liquidity from`);

    try {
      // Remove all liquidity from the position with shouldClaimAndClose: true
      // This will remove liquidity, claim fees, and close the position in one operation
      const removeLiquidityTx = await dlmmPool.removeLiquidity({
        position: targetPosition.publicKey,
        user: userPubkey,
        fromBinId: binIdsToRemove[0],
        toBinId: binIdsToRemove[binIdsToRemove.length - 1],
        bps: new BN(100 * 100), // 100% removal (10000 BPS = 100%)
        shouldClaimAndClose: true, // This will claim swap fees and close position together
      });

      // The removeLiquidity method can return either a single transaction or an array of transactions
      const transactions = Array.isArray(removeLiquidityTx) ? removeLiquidityTx : [removeLiquidityTx];
      
      // Serialize all transactions for frontend signing
      const serializedTransactions = transactions.map(tx => Array.from(tx.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      })));

      return NextResponse.json({
        success: true,
        message: 'Withdraw and close position transactions created successfully',
        serializedTransactions,
        transactionCount: transactions.length,
        positionAddress,
        walletAddress,
        binsRemoved: binIdsToRemove.length
      });

    } catch (withdrawError) {
      console.error('Error creating withdraw and close transaction:', withdrawError);
      
      // Check for specific error types
      let errorMessage = 'Failed to create withdraw and close transaction';
      
      if (withdrawError instanceof Error) {
        errorMessage = withdrawError.message;
      }
      
      return NextResponse.json({
        success: false,
        error: errorMessage,
        errorCode: 'WITHDRAW_CLOSE_FAILED'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in withdraw and close position:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to withdraw and close position',
        success: false 
      },
      { status: 500 }
    );
  }
} 