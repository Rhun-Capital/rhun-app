// app/api/market-sentiment/route.ts
import { NextResponse } from 'next/server';
import { getFearGreedIndex } from '@/utils/market-sentiment';

export async function GET() {
  try {
    const fearGreedData = await getFearGreedIndex();
    
    return NextResponse.json(fearGreedData);
  } catch (error) {
    console.error('Error fetching market sentiment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market sentiment data' },
      { status: 500 }
    );
  }
}