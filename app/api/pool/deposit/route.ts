import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { getStablePool } from '@/utils/meteora-dynamic';
import BN from 'bn.js';

export const runtime = 'nodejs';

// Hardcoded RHUN-SOL pool address and tokenA (RHUN)
const RHUN_SOL_POOL = '2jxVjkPignEbR5pbGNtiRyCc6fAKZTKuFTf1MQED9pt5';
const RHUN_MINT = 'Gh8yeA9vH5Fun7J6esFH3mV65cQTBpxk9Z5XpzU7pump';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      walletAddress, 
      tokenXAmount, 
      tokenYAmount, 
      strategy = 'spot', 
      binRange = 10, 
      autoFill = true 
    } = body;

    // Validate required parameters
    if (!walletAddress || !tokenXAmount) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (isNaN(tokenXAmount) || tokenXAmount <= 0) {
      return NextResponse.json({ error: 'Invalid tokenXAmount' }, { status: 400 });
    }

    if (tokenYAmount && (isNaN(tokenYAmount) || tokenYAmount < 0)) {
      return NextResponse.json({ error: 'Invalid tokenYAmount' }, { status: 400 });
    }

    if (!['spot', 'bidask', 'curve'].includes(strategy)) {
      return NextResponse.json({ error: 'Invalid strategy. Must be spot, bidask, or curve' }, { status: 400 });
    }

    if (isNaN(binRange) || binRange < 1 || binRange > 50) {
      return NextResponse.json({ error: 'Invalid binRange. Must be between 1 and 50' }, { status: 400 });
    }

    // Validate wallet address
    let walletPubkey: PublicKey;
    try {
      walletPubkey = new PublicKey(walletAddress);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 });
    }

    // Initialize pool
    const pool = getStablePool(RHUN_SOL_POOL);
    await pool.initialize(RHUN_MINT);

    // Convert amounts to BN with proper decimals
    const totalXAmount = new BN(Math.floor(tokenXAmount * 1e6)); // RHUN has 6 decimals
    const totalYAmount = tokenYAmount ? new BN(Math.floor(tokenYAmount * 1e9)) : undefined; // SOL has 9 decimals

    // Create position
    const result = await pool.createPosition({
      walletAddress: walletPubkey,
      totalXAmount,
      totalYAmount,
      strategy: strategy as 'spot' | 'bidask' | 'curve',
      binRange,
      autoFill
    });

    // Get active bin info for response
    const activeBin = await pool.getActiveBin();

    // Serialize the transaction for frontend
    const serializedTransaction = result.transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });

    return NextResponse.json({
      success: true,
      message: 'DLMM position transaction created successfully',
      serializedTransaction: Array.from(serializedTransaction), // Convert to array for JSON
      positionAddress: result.positionKeypair.publicKey.toBase58(),
      positionPrivateKey: Array.from(result.positionKeypair.secretKey), // Client needs this to sign
      activeBinId: activeBin.binId,
      activeBinPrice: activeBin.price,
      poolAddress: RHUN_SOL_POOL,
      strategy,
      binRange,
      amounts: {
        tokenX: tokenXAmount,
        tokenY: tokenYAmount,
        autoFill
      }
    });
  } catch (error) {
    console.error('Error creating DLMM position:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 