// app/api/analyze-token-holders/route.ts
import { NextResponse } from 'next/server';
// import { analyzeSolanaTokenHolders } from '@/utils/analyze-solana-token-holders';

export async function POST(request: Request) {
  try {
    // Extract token addresses from request body
    const { tokenAddresses } = await request.json();

    // Validate input
    if (!tokenAddresses || !Array.isArray(tokenAddresses)) {
      return NextResponse.json(
        { error: 'Token addresses must be provided as an array' },
        { status: 400 }
      );
    }

    // Validate each address format
    const isValidAddress = (addr: string) => addr.length === 44 || addr.length === 43;
    if (!tokenAddresses.every(isValidAddress)) {
      return NextResponse.json(
        { error: 'Invalid Solana address format' },
        { status: 400 }
      );
    }

    // Call the analysis function
    // const analysis = await analyzeSolanaTokenHolders(tokenAddresses);
    const analysis: any[] = [];

    // Return the results
    return NextResponse.json({ data: analysis });

  } catch (error: any) {
    console.error('Error in token analysis:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}