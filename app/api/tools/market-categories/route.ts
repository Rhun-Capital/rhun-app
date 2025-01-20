// app/api/market/categories/route.ts
import { NextResponse } from 'next/server';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const COINGECKO_BASE_URL = process.env.COINGECKO_BASE_URL;

export async function GET() {
  try {
    const response = await fetch(
      `${COINGECKO_BASE_URL}/coins/categories`,
      {
        headers: {
          'accept': 'application/json',
          'x-cg-pro-api-key': COINGECKO_API_KEY!
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch category data');
    }

    const data = await response.json();

    // Sort categories by market cap
    const sortedData = data.sort((a: any, b: any) => b.market_cap - a.market_cap);

    // Take top 20 categories and format them
    const formattedData = sortedData.slice(0, 20).map((category: any) => ({
      id: category.id,
      name: category.name,
      marketCap: category.market_cap,
      volume24h: category.volume_24h,
      topCoins: category.top_3_coins,
      change24h: category.market_cap_change_24h,
    }));

    return NextResponse.json(formattedData);
  } catch (error: any) {
    console.error('Error fetching category data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch category data' },
      { status: 500 }
    );
  }
}