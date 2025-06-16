import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletAddress, amount, slippage } = body;

    // Validate required parameters
    if (!walletAddress || !amount) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Validate wallet address
    try {
      new PublicKey(walletAddress);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 });
    }

    // DLMM withdrawals require position management
    // This is more complex than simple withdrawals in Dynamic AMM
    return NextResponse.json(
      { 
        error: 'DLMM withdrawals require position management with bin ranges. Please use the Meteora UI for now.',
        info: 'DLMM uses a different liquidity model that requires managing existing positions.'
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error in DLMM withdraw endpoint:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 