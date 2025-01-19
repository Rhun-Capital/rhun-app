import { NextResponse } from 'next/server';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const COINGECKO_BASE_URL = process.env.COINGECKO_BASE_URL;

interface TokenSearchResult {
  id: string;
  name: string;
  symbol: string;
  marketCapRank: number;
  thumb: string;
  large: string;
  contractAddress?: string;
  platforms?: Record<string, string>;
  onchainData?: {
    decimals?: number;
    total_supply?: string;
    price_usd?: string;
    volume_usd?: {
      h24: string;
    };
    market_cap_usd?: string;
    image_url?: string;
  };
  marketData?: {
    currentPrice?: number;
    priceChange24h?: number;
    marketCap?: number;
    totalVolume?: number;
    circulatingSupply?: number;
    totalSupply?: number;
    description?: string;
    lastUpdated?: string;
  };
}

async function fetchOnchainData(platform: string, address: string) {
  try {
    const response = await fetch(
      `${COINGECKO_BASE_URL}/onchain/networks/${platform}/tokens/${address}/info`,
      {
        headers: {
          'accept': 'application/json',
          'x-cg-pro-api-key': COINGECKO_API_KEY!
        },
      }
    );

    if (!response.ok) return null;
    const json = await response.json();
    return json.data?.attributes;
  } catch (error) {
    console.error(`Error fetching onchain data for ${address}:`, error);
    return null;
  }
}

async function fetchMarketData(platform: string, address: string) {
  try {
    const response = await fetch(
      `${COINGECKO_BASE_URL}/coins/${platform}/contract/${address}`,
      {
        headers: {
          'accept': 'application/json',
          'x-cg-pro-api-key': COINGECKO_API_KEY!
        },
      }
    );

    if (!response.ok) return null;
    
    const data = await response.json();
    return {
      currentPrice: data.market_data?.current_price?.usd,
      priceChange24h: data.market_data?.price_change_percentage_24h,
      marketCap: data.market_data?.market_cap?.usd,
      totalVolume: data.market_data?.total_volume?.usd,
      circulatingSupply: data.market_data?.circulating_supply,
      totalSupply: data.market_data?.total_supply,
      description: data.description?.en,
      lastUpdated: data.last_updated
    };
  } catch (error) {
    console.error(`Error fetching market data for ${address}:`, error);
    return null;
  }
}

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
    const topResults = data.coins.slice(0, 5);
    
    const enrichedResults = await Promise.all(
      topResults.map(async (coin: any): Promise<TokenSearchResult> => {
        let onchainData = null;
        let marketData: TokenSearchResult['marketData'] = undefined;
        
        if (coin.platforms && Object.keys(coin.platforms).length > 0) {
          const [platform, address] = Object.entries(coin.platforms)[0] as [string, string];
          if (typeof address === 'string') {
            // Fetch both onchain and market data in parallel
            const [onchainDataResult, marketDataResult] = await Promise.all([
              fetchOnchainData(platform, address),
              fetchMarketData(platform, address)
            ]);
            onchainData = onchainDataResult;
            marketData = marketDataResult || {};
          }
        }

        return {
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          marketCapRank: coin.market_cap_rank,
          thumb: coin.thumb,
          large: coin.large,
          platforms: coin.platforms,
          contractAddress: coin.platforms ? (Object.values(coin.platforms)[0] as string) : undefined,
          onchainData,
          marketData
        };
      })
    );

    console.log('Search results:', enrichedResults);

    return NextResponse.json({ coins: enrichedResults });
  } catch (error) {
    console.error('Error searching tokens:', error);
    return NextResponse.json(
      { error: 'Failed to search tokens' },
      { status: 500 }
    );
  }
}