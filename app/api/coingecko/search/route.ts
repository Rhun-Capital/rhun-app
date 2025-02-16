// app/api/coingecko/search/route.ts
import { NextRequest, NextResponse } from 'next/server';

const COINGECKO_API_URL = 'https://pro-api.coingecko.com/api/v3';
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;

interface CoinSearchResult {
  id: string;
  name: string;
  api_symbol: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
  large: string;
  platforms?: Record<string, string>;
}

interface ExchangeSearchResult {
  id: string;
  name: string;
  market_type: string;
  thumb: string;
  large: string;
}

interface CategorySearchResult {
  id: string;
  name: string;
}

interface NftSearchResult {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
}

interface CoinGeckoSearchResponse {
  coins: CoinSearchResult[];
  exchanges: ExchangeSearchResult[];
  categories: CategorySearchResult[];
  nfts: NftSearchResult[];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    if (!COINGECKO_API_KEY) {
      return NextResponse.json(
        { error: 'Coingecko API key is not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${COINGECKO_API_URL}/search?query=${encodeURIComponent(query)}`, {
      headers: {
        'accept': 'application/json',
        'x-cg-pro-api-key': COINGECKO_API_KEY
      },
      next: {
        revalidate: 60 // Cache for 60 seconds
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Coingecko API error: ${error}`);
    }

    const data: CoinGeckoSearchResponse = await response.json();

    // Transform the response with complete data
    const transformedData = {
      coins: data.coins.map((coin) => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        api_symbol: coin.api_symbol,
        market_cap_rank: coin.market_cap_rank,
        images: {
          thumb: coin.thumb,
          large: coin.large
        },
        platforms: coin.platforms || {},
        // Add additional metadata
        metadata: {
          has_platform_data: !!coin.platforms && Object.keys(coin.platforms).length > 0,
          is_top_100: coin.market_cap_rank ? coin.market_cap_rank <= 100 : false
        }
      })),
      exchanges: data.exchanges.map((exchange) => ({
        id: exchange.id,
        name: exchange.name,
        market_type: exchange.market_type,
        images: {
          thumb: exchange.thumb,
          large: exchange.large
        }
      })),
      categories: data.categories,
      nfts: data.nfts.map((nft) => ({
        id: nft.id,
        name: nft.name,
        symbol: nft.symbol,
        image: nft.thumb
      })),
      // Add response metadata
      metadata: {
        total_results: {
          coins: data.coins.length,
          exchanges: data.exchanges.length,
          categories: data.categories.length,
          nfts: data.nfts.length
        },
        timestamp: new Date().toISOString(),
        cached: false // You could set this based on response headers
      }
    };

    return NextResponse.json(transformedData);

  } catch (error) {
    console.error('Coingecko search error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch data from Coingecko',
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}