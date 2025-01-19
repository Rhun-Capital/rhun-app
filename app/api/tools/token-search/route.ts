// app/api/token-search/route.ts
import { NextResponse } from 'next/server';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const COINGECKO_BASE_URL = 'https://pro-api.coingecko.com/api/v3';

export async function GET(
  request: Request
) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${COINGECKO_BASE_URL}/search?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'accept': 'application/json',
          'x-cg-pro-api-key': COINGECKO_API_KEY!
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch search results');
    }

    const data = await response.json();

    // Format the response to include relevant data
    const formattedResults = {
      coins: data.coins.map((coin: any) => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        marketCapRank: coin.market_cap_rank,
        thumb: coin.thumb,
        large: coin.large
      })).slice(0, 5) // Limit to top 5 results
    };

    return NextResponse.json(formattedResults);
  } catch (error) {
    console.error('Error searching tokens:', error);
    return NextResponse.json(
      { error: 'Failed to search tokens' },
      { status: 500 }
    );
  }
}