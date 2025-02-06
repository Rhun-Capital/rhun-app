// app/api/coins/[id]/route.ts
import { NextResponse } from 'next/server';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const COINGECKO_BASE_URL = process.env.COINGECKO_BASE_URL;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id) {
      return NextResponse.json(
        { error: 'Coin ID is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${COINGECKO_BASE_URL}/coins/${params.id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
      {
        headers: {
          'accept': 'application/json',
          'x-cg-pro-api-key': COINGECKO_API_KEY!
        },
        next: { revalidate: 60 }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch coin details');
    }

    const data = await response.json();

    const formattedData = {
      id: data.id,
      name: data.name,
      symbol: data.symbol,
      description: {
        en: data.description?.en
      },
      platforms: data.platforms || {},
      contracts: data.detail_platforms || {},
      market_data: {
        current_price: {
          usd: data.market_data?.current_price?.usd
        },
        price_change_percentage_24h: data.market_data?.price_change_percentage_24h,
        price_change_percentage_7d: data.market_data?.price_change_percentage_7d,
        price_change_percentage_30d: data.market_data?.price_change_percentage_30d,
        market_cap: {
          usd: data.market_data?.market_cap?.usd
        },
        total_volume: {
          usd: data.market_data?.total_volume?.usd
        },
        circulating_supply: data.market_data?.circulating_supply,
        total_supply: data.market_data?.total_supply
      },
      image: {
        large: data.image?.large
      },
      links: {
        homepage: data.links?.homepage,
        twitter_screen_name: data.links?.twitter_screen_name
      },
      last_updated: data.last_updated
    };

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching coin details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coin details' },
      { status: 500 }
    );
  }
}