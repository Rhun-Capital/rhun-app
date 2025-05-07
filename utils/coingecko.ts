import { COINGECKO_API_KEY } from '@/utils/constants';

const COINGECKO_BASE_URL = 'https://pro-api.coingecko.com/api/v3';
const DEXSCREENER_API_URL = 'https://api.dexscreener.com/latest/dex';

interface CoinGeckoTokenMetadata {
  symbol: string;
  name: string;
  image: {
    thumb: string;
    small: string;
    large: string;
  };
  market_data?: {
    current_price: {
      usd: number;
    };
    market_cap: {
      usd: number;
    };
  };
}

interface DexScreenerPair {
  baseToken: {
    address: string;
    symbol: string;
    name: string;
  };
  quoteToken: {
    address: string;
    symbol: string;
    name: string;
  };
  priceUsd: string;
  liquidity: {
    usd: number;
  };
}

/**
 * Fetch token price from DexScreener as fallback
 */
async function fetchDexScreenerPrice(contractAddress: string): Promise<number | null> {
  try {
    const response = await fetch(`${DEXSCREENER_API_URL}/tokens/solana/${contractAddress}`);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data.pairs || data.pairs.length === 0) {
      return null;
    }

    // Sort pairs by liquidity to get the most liquid pair
    const sortedPairs = data.pairs.sort((a: DexScreenerPair, b: DexScreenerPair) => 
      (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    );

    // Get price from the most liquid pair
    const bestPair = sortedPairs[0];
    return parseFloat(bestPair.priceUsd) || null;
  } catch (error) {
    console.error('Error fetching DexScreener price:', error);
    return null;
  }
}

/**
 * Fetch token metadata from CoinGecko API with DexScreener fallback for price
 */
export async function fetchCoinGeckoTokenMetadata(contractAddress: string): Promise<CoinGeckoTokenMetadata | null> {
  try {
    const response = await fetch(
      `${COINGECKO_BASE_URL}/coins/solana/contract/${contractAddress}`,
      {
        headers: {
          'accept': 'application/json',
          'x-cg-pro-api-key': COINGECKO_API_KEY
        }
      }
    );

    if (!response.ok) {
      console.error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    // If CoinGecko doesn't have price data, try DexScreener
    if (!data.market_data?.current_price?.usd) {
      const dexScreenerPrice = await fetchDexScreenerPrice(contractAddress);
      if (dexScreenerPrice) {
        // Add the DexScreener price to the metadata
        if (!data.market_data) {
          data.market_data = {};
        }
        if (!data.market_data.current_price) {
          data.market_data.current_price = {};
        }
        data.market_data.current_price.usd = dexScreenerPrice;
      }
    }

    return data;
  } catch (error) {
    console.error('Error fetching token metadata from CoinGecko:', error);
    return null;
  }
}

/**
 * Fetch token prices for multiple addresses with DexScreener fallback
 */
export async function fetchTokenPrices(contractAddresses: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  
  try {
    // Try CoinGecko first
    const response = await fetch(
      `${COINGECKO_BASE_URL}/simple/token_price/solana?contract_addresses=${contractAddresses.join(',')}&vs_currencies=usd`,
      {
        headers: {
          'accept': 'application/json',
          'x-cg-pro-api-key': COINGECKO_API_KEY
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      Object.entries(data).forEach(([address, priceData]: [string, any]) => {
        prices[address] = priceData.usd || 0;
      });
    }

    // For any tokens that didn't get a price from CoinGecko, try DexScreener
    const missingPrices = contractAddresses.filter(addr => !prices[addr] || prices[addr] === 0);
    
    for (const address of missingPrices) {
      const dexScreenerPrice = await fetchDexScreenerPrice(address);
      if (dexScreenerPrice) {
        prices[address] = dexScreenerPrice;
      }
    }

    return prices;
  } catch (error) {
    console.error('Error fetching token prices:', error);
    return prices;
  }
}

/**
 * Calculate USD value of a token amount
 */
export function calculateTokenValue(amount: number, price: number, decimals: number = 9): number {
  const adjustedAmount = amount / Math.pow(10, decimals);
  return adjustedAmount * price;
} 