// app/api/coins/[id]/route.ts
import { NextResponse } from 'next/server';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const COINGECKO_BASE_URL = process.env.COINGECKO_BASE_URL;
const HOLDERSCAN_API_URL = process.env.HOLDERSCAN_API_URL;
const HOLDERSCAN_API_KEY = process.env.HOLDERSCAN_API_KEY;

async function getHolderStats(tokenAddress: string) {
  try {
    if (!HOLDERSCAN_API_KEY) {
      console.error('HOLDERSCAN_API_KEY is not configured');
      return null;
    }

    const [statsResponse, breakdownResponse, deltasResponse] = await Promise.all([
      fetch(
        `${HOLDERSCAN_API_URL}/v0/sol/tokens/${tokenAddress}/stats`,
        {
          headers: {
            'x-api-key': HOLDERSCAN_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      ),
      fetch(
        `${HOLDERSCAN_API_URL}/v0/sol/tokens/${tokenAddress}/holders/breakdowns`,
        {
          headers: {
            'x-api-key': HOLDERSCAN_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      ),
      fetch(
        `${HOLDERSCAN_API_URL}/v0/sol/tokens/${tokenAddress}/holders/deltas`,
        {
          headers: {
            'x-api-key': HOLDERSCAN_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      )
    ]);

    let stats = null;
    let breakdown = null;
    let deltas = null;

    if (statsResponse.ok) {
      stats = await statsResponse.json();
    } else {
      console.error('Stats error:', await statsResponse.text());
    }

    if (breakdownResponse.ok) {
      breakdown = await breakdownResponse.json();
    } else {
      console.error('Breakdown error:', await breakdownResponse.text());
    }

    if (deltasResponse.ok) {
      deltas = await deltasResponse.json();
    } else {
      console.error('Deltas error:', await deltasResponse.text());
    }

    return {
      statistics: stats,
      breakdown: breakdown,
      deltas: deltas
    };
  } catch (error) {
    console.error('Error fetching holder stats:', error);
    return null;
  }
}

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

    // Check if the token has a Solana platform address
    let holderStats = null;
    if (data.platforms && data.platforms.solana) {
      holderStats = await getHolderStats(data.platforms.solana);
    }

    return NextResponse.json({
      ...data,
      holder_stats: holderStats
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coin details' },
      { status: 500 }
    );
  }
}