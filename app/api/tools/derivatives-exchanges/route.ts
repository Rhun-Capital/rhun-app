// app/api/market/derivatives-exchanges/route.ts
import { NextResponse } from 'next/server';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const COINGECKO_BASE_URL = process.env.COINGECKO_BASE_URL;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const order = searchParams.get('order') || 'open_interest_btc_desc';
    const perPage = searchParams.get('per_page') || '20';
    const page = searchParams.get('page') || '1';

    const response = await fetch(
      `${COINGECKO_BASE_URL}/derivatives/exchanges?order=${order}&per_page=${perPage}&page=${page}`,
      {
        headers: {
          'accept': 'application/json',
          'x-cg-pro-api-key': COINGECKO_API_KEY!
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch derivatives exchanges data');
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching derivatives exchanges:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch derivatives exchanges' },
      { status: 500 }
    );
  }
}