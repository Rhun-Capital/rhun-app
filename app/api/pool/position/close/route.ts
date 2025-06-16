import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';
import { getSolanaConnection, ProxyConnection } from '@/utils/solana';

const POOL_ADDRESS = '2jxVjkPignEbR5pbGNtiRyCc6fAKZTKuFTf1MQED9pt5';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, positionAddress } = body;

    if (!walletAddress || !positionAddress) {
      return NextResponse.json({ error: 'Wallet address and position address are required' }, { status: 400 });
    }

    console.log('Closing position:', positionAddress, 'for wallet:', walletAddress);

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

    // Check if position has liquidity before attempting to close
    const positionData = targetPosition.positionData;
    const totalXAmount = (positionData as any).totalXAmount || 0;
    const totalYAmount = (positionData as any).totalYAmount || 0;
    
    // Convert to readable amounts to check if position is empty
    const readableXAmount = Number(totalXAmount.toString()) / 1e6; // RHUN decimals
    const readableYAmount = Number(totalYAmount.toString()) / 1e9; // SOL decimals
    
    console.log(`Position liquidity check - RHUN: ${readableXAmount}, SOL: ${readableYAmount}`);
    
    // If position has significant liquidity, return error before attempting to close
    if (readableXAmount > 0.001 || readableYAmount > 0.000001) {
      return NextResponse.json({
        success: false,
        error: 'Position must be empty before closing. Please remove all liquidity first by using the "Withdraw & Close All" button on Meteora, or remove liquidity manually then try closing again.',
        errorCode: 'POSITION_NOT_EMPTY',
        liquidityInfo: {
          rhunAmount: readableXAmount,
          solAmount: readableYAmount
        }
      }, { status: 400 });
    }

    try {
      // Create close position transaction
      const closePositionTx = await dlmmPool.closePosition({
        owner: userPubkey,
        position: targetPosition,
      });

      // Serialize transaction for frontend signing
      const serializedTransaction = Array.from(closePositionTx.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      }));

      return NextResponse.json({
        success: true,
        message: 'Close position transaction created successfully',
        serializedTransaction,
        positionAddress,
        walletAddress
      });

    } catch (closeError) {
      console.error('Error creating close position transaction:', closeError);
      
      // Check for specific error types
      let errorMessage = 'Failed to create close position transaction';
      
      if (closeError instanceof Error) {
        if (closeError.message.includes('NonEmptyPosition') || closeError.message.includes('6030')) {
          errorMessage = 'Position must be empty before closing. Please remove all liquidity first by using the "Withdraw & Close All" button on Meteora, or remove liquidity manually then try closing again.';
        } else {
          errorMessage = closeError.message;
        }
      }
      
      return NextResponse.json({
        success: false,
        error: errorMessage,
        errorCode: closeError instanceof Error && closeError.message.includes('6030') ? 'POSITION_NOT_EMPTY' : 'UNKNOWN'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error closing position:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to close position',
        success: false 
      },
      { status: 500 }
    );
  }
} 