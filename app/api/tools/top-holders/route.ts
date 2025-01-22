// app/api/tools/top-holders/route.ts
import { NextResponse } from 'next/server';
import { getTopHolders } from '@/utils/get-top-holders';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Token address is required' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!address.match(/^[1-9A-HJ-NP-Za-km-z]{43,44}$/)) {
      return NextResponse.json(
        { error: 'Invalid Solana address format' },
        { status: 400 }
      );
    }

    const holders = await getTopHolders(address);

    console.log(holders, 'holders')
    
    return NextResponse.json({
      success: true,
      data: holders
    });

  } catch (error: any) {
    console.error('Error fetching top holders:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch top holders' 
      },
      { status: 500 }
    );
  }
}