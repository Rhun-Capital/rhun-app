// app/api/market/global/route.ts
import { NextResponse } from 'next/server';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const COINGECKO_BASE_URL = process.env.COINGECKO_BASE_URL;

export async function GET() {
  try {
    const response = await fetch(
      `${COINGECKO_BASE_URL}/global`,
      {
        headers: {
          'accept': 'application/json',
          'x-cg-pro-api-key': COINGECKO_API_KEY!
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch global market data');
    }

    const data = await response.json();

    // Format the response to include relevant data
    const formattedData = {
      totalMarketCap: data.data.total_market_cap.usd,
      totalVolume: data.data.total_volume.usd,
      marketCapPercentage: data.data.market_cap_percentage,
      marketCapChange24h: data.data.market_cap_change_percentage_24h_usd,
      activeCryptocurrencies: data.data.active_cryptocurrencies,
      lastUpdated: data.data.updated_at
    };

    return NextResponse.json(formattedData);
  } catch (error: any) {
    console.error('Error fetching global market data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}