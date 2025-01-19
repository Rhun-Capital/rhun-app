// app/api/tools/token-info/[contractAddress]/route.ts
import HomePage from '@/app/(preview)/page';
import { NextResponse } from 'next/server';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const COINGECKO_BASE_URL = process.env.COINGECKO_BASE_URL;

export async function GET(
  request: Request,
  { params }: { params: { contractAddress: string } }
) {
  try {
    const response = await fetch(
      `${COINGECKO_BASE_URL}/coins/solana/contract/${params.contractAddress}`,
      {
        headers: {
          'accept': 'application/json',
          'x-cg-pro-api-key': COINGECKO_API_KEY!
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
            { error: 'Failed to fetch token information' },
            { status: 500 }
        );
    }

    const data = await response.json();

    console.log(data)

    // Format the response to include only relevant data
    const tokenInfo = {
      name: data.name,
      symbol: data.symbol,
      image: data.image.small,
      marketCap: data.market_data?.market_cap?.usd,
      currentPrice: data.market_data?.current_price?.usd,
      priceChange24h: data.market_data?.price_change_percentage_24h,
      totalVolume: data.market_data?.total_volume?.usd,
      circulatingSupply: data.market_data?.circulating_supply,
      totalSupply: data.market_data?.total_supply,
      description: data.description?.en,
      lastUpdated: data.last_updated,
      homePage: data.links?.homepage[0],
      twitter: data.links?.twitter_screen_name,
    };

    return NextResponse.json(tokenInfo);
  } catch (error) {
    console.error('Error fetching token info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token information' },
      { status: 500 }
    );
  }
}