import { NextResponse } from 'next/server';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const COINGECKO_BASE_URL = process.env.COINGECKO_BASE_URL;

export async function GET() {
  try {
    // First, fetch the market movers
    const moversResponse = await fetch(
      `${COINGECKO_BASE_URL}/coins/top_gainers_losers?vs_currency=usd`,
      {
        headers: {
          'accept': 'application/json',
          'x-cg-pro-api-key': COINGECKO_API_KEY!
        },
      }
    );

    if (!moversResponse.ok) {
      throw new Error('Failed to fetch market movers');
    }

    const moversData = await moversResponse.json();

    // Extract all coin IDs from both gainers and losers
    const allCoinIds = [
      ...moversData.top_gainers.map((coin: any) => coin.id),
      ...moversData.top_losers.map((coin: any) => coin.id)
    ];

    // Fetch detailed market data for all coins
    const detailsResponse = await fetch(
      `${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&ids=${allCoinIds.join(',')}&order=market_cap_desc&per_page=${allCoinIds.length}&page=1&sparkline=false`,
      {
        headers: {
          'accept': 'application/json',
          'x-cg-pro-api-key': COINGECKO_API_KEY!
        },
      }
    );

    if (!detailsResponse.ok) {
      throw new Error('Failed to fetch market details');
    }

    const detailsData = await detailsResponse.json();

    // Create a map of coin details for easy lookup
    interface CoinDetails {
      id: string;
      current_price: number;
      price_change_percentage_24h: number;
    }

    const detailsMap = new Map<string, CoinDetails>(
      detailsData.map((coin: CoinDetails) => [coin.id, coin])
    );

    // Combine the data
    const formattedData = {
      top_gainers: moversData.top_gainers.map((coin: any) => ({
        name: coin.name,
        symbol: coin.symbol,
        image: coin.image,
        // Add additional details from the markets endpoint
        price: detailsMap.get(coin.id)?.current_price,
        priceChange24h: detailsMap.get(coin.id)?.price_change_percentage_24h,        
      })),
      top_losers: moversData.top_losers.map((coin: any) => ({
        name: coin.name,
        symbol: coin.symbol,
        image: coin.image,
        // Add additional details from the markets endpoint
        price: detailsMap.get(coin.id)?.current_price,
        priceChange24h: detailsMap.get(coin.id)?.price_change_percentage_24h,               
      }))
    };

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching market data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}