interface CoinGeckoPrice {
  usd: number;
  usd_24h_change: number;
}

interface CoinGeckoResponse {
  [key: string]: CoinGeckoPrice;
}

interface TokenInfo {
  id: string;
  symbol: string;
  name: string;
  image: string;
  description: string;
}

export async function getTokenPrices(ids: string[]): Promise<CoinGeckoResponse> {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch token prices');
  }

  return response.json();
}

export async function getTokenInfo(id: string): Promise<TokenInfo> {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch token info');
  }

  const data = await response.json();
  
  return {
    id: data.id,
    symbol: data.symbol.toUpperCase(),
    name: data.name,
    image: data.image.large,
    description: data.description.en
  };
}

// List of supported tokens
export const SUPPORTED_TOKENS = [
  {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    description: 'High-performance blockchain platform'
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    symbol: 'JUP',
    description: 'Leading DEX aggregator on Solana'
  },
  {
    id: 'bonk',
    name: 'Bonk',
    symbol: 'BONK',
    description: 'Community-driven meme token on Solana'
  }
]; 