// app/api/coingecko/coins/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

const COINGECKO_API_URL = 'https://pro-api.coingecko.com/api/v3';
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Coin ID is required' },
        { status: 400 }
      );
    }

    if (!COINGECKO_API_KEY) {
      return NextResponse.json(
        { error: 'Coingecko API key is not configured' },
        { status: 500 }
      );
    }

    // Make request to Coingecko
    const response = await fetch(`${COINGECKO_API_URL}/coins/${id}`, {
      headers: {
        'accept': 'application/json',
        'x-cg-pro-api-key': COINGECKO_API_KEY
      },
      next: {
        revalidate: 300 // Cache for 5 minutes
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Coin not found' },
          { status: 404 }
        );
      }
      throw new Error(`Coingecko API error: ${await response.text()}`);
    }

    const data = await response.json();

    // Transform and filter the response to include only necessary data
    const filteredData = {
      id: data.id,
      symbol: data.symbol,
      name: data.name,
      platforms: data.platforms,
      market_data: {
        current_price: data.market_data?.current_price,
        market_cap: data.market_data?.market_cap,
        total_volume: data.market_data?.total_volume,
        price_change_percentage_24h: data.market_data?.price_change_percentage_24h
      },
      image: data.image,
      last_updated: data.last_updated
    };

    return NextResponse.json(filteredData);

  } catch (error) {
    console.error('Coingecko coin fetch error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch coin data from Coingecko' },
      { status: 500 }
    );
  }
}

