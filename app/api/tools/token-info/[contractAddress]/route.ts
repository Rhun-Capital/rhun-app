import { NextResponse } from 'next/server';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const COINGECKO_BASE_URL = process.env.COINGECKO_BASE_URL;

interface OnChainData {
  name: string;
  symbol: string;
  decimals: number;
  total_supply: string;
  // Add other relevant onchain fields
}

interface MarketData {
  name: string;
  symbol: string;
  image: string;
  marketCap: number;
  currentPrice: number;
  priceChange24h: number;
  totalVolume: number;
  circulatingSupply: number;
  totalSupply: number;
  description: string;
  lastUpdated: string;
  homePage: string;
  twitter: string;
}

export async function GET(
  request: Request,
  { params }: { params: { contractAddress: string } }
) {
  try {
    // Fetch both onchain and market data in parallel
    const [onchainResponse, marketDataResponse] = await Promise.all([
      fetch(
        `${COINGECKO_BASE_URL}/onchain/networks/solana/tokens/${params.contractAddress}/info`,
        {
          headers: {
            'accept': 'application/json',
            'x-cg-pro-api-key': COINGECKO_API_KEY!
          },
        }
      ),
      fetch(
        `${COINGECKO_BASE_URL}/coins/solana/contract/${params.contractAddress}`,
        {
          headers: {
            'accept': 'application/json',
            'x-cg-pro-api-key': COINGECKO_API_KEY!
          },
        }
      )
    ]);

    // Initialize response objects
    let onchainData: OnChainData | null = null;
    let marketData: MarketData | null = null;

    // Process onchain data if available
    if (onchainResponse.ok) {
      const json = await onchainResponse.json();
      onchainData = json.data;
    }

    // Process market data if available
    if (marketDataResponse.ok) {
      const data = await marketDataResponse.json();
      marketData = {
        name: data.name,
        symbol: data.symbol,
        image: data.image?.small,
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
    }

    // If both requests failed, return an error
    if (!onchainResponse.ok && !marketDataResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch token information' },
        { status: 500 }
      );
    }

    // Combine the data, keeping null values when data is not available
    const combinedData = {
      onchain: onchainData,
      market: marketData,
      // Add a status field to indicate which data was successfully fetched
      status: {
        onchain: onchainResponse.ok,
        market: marketDataResponse.ok
      }
    };

    console.log(combinedData)
    
    return NextResponse.json(combinedData);
  } catch (error) {
    console.error('Error fetching token info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token information' },
      { status: 500 }
    );
  }
}