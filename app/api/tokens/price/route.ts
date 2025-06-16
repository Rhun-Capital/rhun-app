import { NextRequest, NextResponse } from 'next/server';
import { fetchTokenPrices } from '@/utils/coingecko';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    
    if (!address) {
      return NextResponse.json(
        { error: 'Token address is required' },
        { status: 400 }
      );
    }

    // Fetch price using the existing utility
    const prices = await fetchTokenPrices([address]);
    const price = prices[address];
    
    if (price === null || price === undefined) {
      return NextResponse.json(
        { error: 'Price not found for this token' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      address,
      price,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching token price:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token price' },
      { status: 500 }
    );
  }
} 