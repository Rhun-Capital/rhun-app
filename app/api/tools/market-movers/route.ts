import { NextResponse } from 'next/server';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const COINGECKO_BASE_URL = process.env.COINGECKO_BASE_URL;

export async function GET() {
  try {
    const response = await fetch(
      `${COINGECKO_BASE_URL}/coins/top_gainers_losers?vs_currency=usd`,
      {
        headers: {
          'accept': 'application/json',
          'x-cg-pro-api-key': COINGECKO_API_KEY!
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch market movers');
    }

    const data = await response.json();

    // Format the response to include relevant data
    const formattedData = {
      top_gainers: data.top_gainers.map((coin: any) => ({
        name: coin.name,
        symbol: coin.symbol,
        price: coin.current_price,
        priceChange24h: coin.price_change_percentage_24h,
        image: coin.image
      })),
      top_losers: data.top_losers.map((coin: any) => ({
        name: coin.name,
        symbol: coin.symbol,
        price: coin.current_price,
        priceChange24h: coin.price_change_percentage_24h,
        image: coin.image
      }))
    };

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching top gainers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market movers' },
      { status: 500 }
    );
  }
}