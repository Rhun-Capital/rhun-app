import { NextResponse } from 'next/server';
import { findActiveTraders } from '@/utils/token-holders';

export async function POST(request: Request) {
  try {
    const { tokenAddresses, tokenSymbols } = await request.json();

    if (!Array.isArray(tokenAddresses) || !Array.isArray(tokenSymbols)) {
      return NextResponse.json(
        { error: 'tokenAddresses and tokenSymbols must be arrays' },
        { status: 400 }
      );
    }

    if (tokenAddresses.length !== tokenSymbols.length) {
      return NextResponse.json(
        { error: 'tokenAddresses and tokenSymbols arrays must have the same length' },
        { status: 400 }
      );
    }

    const activeTraders = await findActiveTraders(tokenAddresses, tokenSymbols);

    // Format the response
    const formattedResponse = activeTraders.map(trader => ({
      token: trader.tokenSymbol,
      walletAddress: trader.walletAddress,
      lastActivity: trader.lastActivity,
    }));

    return NextResponse.json({ activeTraders: formattedResponse });
  } catch (error) {
    console.error('Error in active traders endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active traders' },
      { status: 500 }
    );
  }
} 