import { DynamoDB } from 'aws-sdk';
import { getSolanaConnection } from '@/utils/solana';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getBulkPriceData } from '@/utils/prices';
import { getTokenMetadata } from '@/utils/tokens';
import { getTransactionCount, getTransactionVolume } from '@/utils/network-activity';
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const COINGECKO_BASE_URL = process.env.COINGECKO_BASE_URL;
const JUPITER_API_URL = process.env.NEXT_PUBLIC_JUPITER_API_URL;
const JUPITER_PRICE_API_URL = 'https://api.jup.ag/price/v2'
const SOLSCAN_API_URL = process.env.NEXT_PUBLIC_SOLSCAN_BASE_URL;

// List of known stablecoin addresses
const STABLECOIN_ADDRESSES = new Set([
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
  'USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX',  // USDH
  // Add more stablecoins as needed
])


const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

interface OnChainData {
    name: string;
    symbol: string;
    decimals: number;
    total_supply: string;
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
      volume_usd?: { h24: string; };
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


// utils/getTopHolders.ts
interface TokenHolder {
    owner: string;
    amount: number;
    percentage: number;
  }

  interface FearGreedData {
    value: number;
    classification: string;
    timestamp: string;
  }
  
  interface FundingRateData {
    symbol: string;
    rate: number;
    timestamp: string;
  }

  interface TokenAccount {
    token_account: string
    token_address: string
    amount: number
    token_decimals: number
    owner: string
  }
  
  interface TokenMetadata {
    token_address: string
    token_name: string
    token_symbol: string
    token_icon: string
  }
  
  interface SolscanResponse {
    success: boolean
    data: TokenAccount[]
    metadata: {
      tokens: {
        [key: string]: TokenMetadata
      }
    }
  }
  
  interface JupiterPriceResponse {
    data: {
      [mintAddress: string]: {
        id: string
        mintSymbol: string
        vsToken: string
        vsTokenSymbol: string
        price: number
      }
    }
  }

  function formatTokenBalance(amount: number, decimals: number): number {
    return amount / Math.pow(10, decimals)
  }
  
  async function getTokenPrices(tokenAddresses: string[]): Promise<{ [key: string]: number }> {
    try {
      // Filter out stablecoins as they're always $1
      const nonStableTokens = tokenAddresses.filter(addr => !STABLECOIN_ADDRESSES.has(addr))
      
      if (nonStableTokens.length === 0) {
        return {}
      }
  
      const queryParams = nonStableTokens.map(String).join(',');
      
      const response = await fetch(`${JUPITER_PRICE_API_URL}?ids=${queryParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch token prices')
      }
  
      const priceData: JupiterPriceResponse = await response.json()
      
      // Create a price map including both Jupiter prices and stablecoin prices
      const priceMap: { [key: string]: number } = {}
      
      // Add Jupiter prices
      Object.entries(priceData.data).forEach(([mintAddress, data]) => {
        if (data)
          priceMap[mintAddress] = data.price
      })
      
      // Add stablecoin prices
      tokenAddresses.forEach(addr => {
        if (STABLECOIN_ADDRESSES.has(addr)) {
          priceMap[addr] = 1 // Stablecoins are always $1
        }
      })
  
      return priceMap
    } catch (error) {
      console.error('Error fetching token prices:', error)
      return {}
    }
  }
  
  async function enrichTokenData(
    data: TokenAccount[], 
    metadata: { tokens: { [key: string]: TokenMetadata } }
  ) {
    // Get all unique token addresses
    const tokenAddresses = [...new Set(data.map(token => token.token_address))]
    
    // Fetch prices for all tokens
    const priceMap = await getTokenPrices(tokenAddresses)
  
    return data.map(token => {
      const tokenMetadata = metadata.tokens[token.token_address]
      const formattedAmount = formatTokenBalance(token.amount, token.token_decimals)
      const price = priceMap[token.token_address] || 0
      
      return {
        ...token,
        formatted_amount: formattedAmount,
        token_name: tokenMetadata?.token_name || 'Unknown Token',
        token_symbol: tokenMetadata?.token_symbol || '???',
        token_icon: tokenMetadata?.token_icon || null,
        usd_price: price,
        usd_value: formattedAmount * price
      }
    })
  }

  export async function getAgentConfig(userId: string, agentId: string) {
    const result = await dynamodb.get({
      TableName: 'Agents',
      Key: { id: agentId, userId }
    }).promise();
  
    if (!result.Item) throw new Error('Agent not found');
    return result.Item;
  }  

  export async function getTokenHoldings(address: string) {
    const queryParams = new URLSearchParams({
        address,
        type: 'token',
        page: '1',
        page_size: '40',
        hide_zero: 'true'
      })

      const response = await fetch(
        `${SOLSCAN_API_URL}/account/token-accounts?${queryParams.toString()}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'token': process.env.SOLSCAN_API_KEY || ''
          },
          next: { revalidate: 60 }
        }
      )

      if (!response.ok) {
        throw new Error(`Solscan API error: ${response.status}`)
      }

      const rawData: SolscanResponse = await response.json()

      if (!rawData.success) {
        throw new Error('Failed to fetch token data from Solscan')
      }

      const data = await enrichTokenData(rawData.data, rawData.metadata)

      // Calculate total portfolio value
      const totalUsdValue = data.reduce((sum, token) => sum + (token.usd_value || 0), 0)

      return { data, totalUsdValue }
  }
  
  export async function getFearGreedIndex(): Promise<FearGreedData> {
    try {
      // Using Alternative.me API for Fear & Greed Index
      const response = await fetch('https://api.alternative.me/fng/');
      const data = await response.json();
      
      return {
        value: parseInt(data.data[0].value),
        classification: data.data[0].value_classification,
        timestamp: data.data[0].timestamp
      };
    } catch (error) {
      throw new Error('Failed to fetch Fear & Greed Index');
    }
  }
  
  export async function getFundingRates(): Promise<FundingRateData[]> {
    try {
      // Using Binance API for funding rates
      const response = await fetch('https://fapi.binance.com/fapi/v1/fundingRate');
      const data = await response.json();
      
      return data
        .filter((rate: any) => rate.symbol.includes('BTC') || rate.symbol.includes('ETH'))
        .map((rate: any) => ({
          symbol: rate.symbol,
          rate: parseFloat(rate.fundingRate) * 100, // Convert to percentage
          timestamp: new Date(rate.fundingTime).toISOString()
        }));
    } catch (error) {
      throw new Error('Failed to fetch Funding Rates');
    }
  }


  export async function getCoinById(coinId: string) {
    try {
      const response = await fetch(
        `${COINGECKO_BASE_URL}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`,
        {
          headers: {
            'accept': 'application/json',
            'x-cg-pro-api-key': COINGECKO_API_KEY!
          },
        }
      );
  
      if (!response.ok) throw new Error('Failed to fetch coin data');
      const data = await response.json();
  
      return {
        id: data.id,
        name: data.name,
        symbol: data.symbol,
        description: { en: data.description?.en },
        platforms: data.platforms,
        market_data: {
          current_price: data.market_data?.current_price,
          price_change_percentage_24h: data.market_data?.price_change_percentage_24h,
          price_change_percentage_7d: data.market_data?.price_change_percentage_7d,
          price_change_percentage_30d: data.market_data?.price_change_percentage_30d,
          market_cap: data.market_data?.market_cap,
          total_volume: data.market_data?.total_volume,
          circulating_supply: data.market_data?.circulating_supply,
          total_supply: data.market_data?.total_supply
        },
        image: {
          large: data.image?.large,
          small: data.image?.small,
          thumb: data.image?.thumb
        },
        links: {
          homepage: data.links?.homepage,
          twitter_screen_name: data.links?.twitter_screen_name
        },
        market_cap_rank: data.market_cap_rank,
        last_updated: data.last_updated
      };
    } catch (error) {
      console.error('Error fetching coin data:', error);
      throw new Error('Failed to fetch coin data');
    }
  } 


export async function getPortfolioValue(walletAddress: string) {
  if (!walletAddress) {
    return "I don't have a wallet configured yet, you can create by visiting the wallet tab in the agent settings.";
  }
  
  const connection = getSolanaConnection();
  const pubKey = new PublicKey(walletAddress);

  const solBalance = await connection.getBalance(pubKey);
  const solInWallet = solBalance / LAMPORTS_PER_SOL;

  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    pubKey,
    { programId: TOKEN_PROGRAM_ID }
  );

  const WRAPPED_SOL_MINT = 'So11111111111111111111111111111111111111112';
  const tokenMints = [
    WRAPPED_SOL_MINT,
    ...tokenAccounts.value.map(account => account.account.data.parsed.info.mint)
  ];

  const priceData = await getBulkPriceData(tokenMints);
  const tokenMetadata = await getTokenMetadata(tokenMints);

  const holdings = [
    {
      mint: WRAPPED_SOL_MINT,
      symbol: 'SOL',
      name: 'Solana',
      amount: solInWallet,
      usdValue: solInWallet * (priceData[WRAPPED_SOL_MINT]?.price || 0),
      priceChange24h: priceData[WRAPPED_SOL_MINT]?.priceChange24h || 0,
      volume24h: priceData[WRAPPED_SOL_MINT]?.volume24h || 0,
      logoURI: tokenMetadata[WRAPPED_SOL_MINT]?.logoURI
    },
    ...tokenAccounts.value.map(account => {
      const mintAddress = account.account.data.parsed.info.mint;
      const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
      const price = priceData[mintAddress]?.price || 0;
      
      return {
        mint: mintAddress,
        symbol: tokenMetadata[mintAddress]?.symbol || mintAddress.slice(0, 4) + '...',
        name: tokenMetadata[mintAddress]?.name || 'Unknown Token',
        logoURI: tokenMetadata[mintAddress]?.logoURI,
        amount,
        usdValue: amount * price,
        priceChange24h: priceData[mintAddress]?.priceChange24h || 0,
        volume24h: priceData[mintAddress]?.volume24h || 0
      };
    })
  ]
  return { holdings };
}


export async function getTokenInfo(contractAddress: string) {
    try {
      const [onchainResponse, marketDataResponse] = await Promise.all([
        fetch(`${COINGECKO_BASE_URL}/onchain/networks/solana/tokens/${contractAddress}/info`, {
          headers: {
            'accept': 'application/json',
            'x-cg-pro-api-key': COINGECKO_API_KEY!
          },
        }),
        fetch(`${COINGECKO_BASE_URL}/coins/solana/contract/${contractAddress}`, {
          headers: {
            'accept': 'application/json',
            'x-cg-pro-api-key': COINGECKO_API_KEY!
          },
        })
      ]);
  
      let onchainData: OnChainData | null = null;
      let marketData: MarketData | null = null;
  
      if (onchainResponse.ok) {
        const json = await onchainResponse.json();
        onchainData = json.data;
      }
  
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
  
      if (!onchainResponse.ok && !marketDataResponse.ok) {
        return { error: 'Failed to fetch token information' };
      }
  
      return {
        onchain: onchainData,
        market: marketData,
        status: {
          onchain: onchainResponse.ok,
          market: marketDataResponse.ok
        }
      };
    } catch (error) {
      console.error('Error fetching token info:', error);
      return { error: 'Failed to fetch token information' };
    }
}

export async function getMarketMovers() {
    try {
      const moversResponse = await fetch(`${COINGECKO_BASE_URL}/coins/top_gainers_losers?vs_currency=usd`, {
        headers: {
          'accept': 'application/json',
          'x-cg-pro-api-key': COINGECKO_API_KEY!
        },
      });
  
      if (!moversResponse.ok) throw new Error('Failed to fetch market movers');
      const moversData = await moversResponse.json();
  
      const allCoinIds = [
        ...moversData.top_gainers.map((coin: any) => coin.id),
        ...moversData.top_losers.map((coin: any) => coin.id)
      ];
  
      const detailsResponse = await fetch(
        `${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&ids=${allCoinIds.join(',')}&order=market_cap_desc&per_page=${allCoinIds.length}&page=1&sparkline=false`,
        {
          headers: {
            'accept': 'application/json',
            'x-cg-pro-api-key': COINGECKO_API_KEY!
          },
        }
      );
  
      if (!detailsResponse.ok) throw new Error('Failed to fetch market details');
      const detailsData = await detailsResponse.json();
  
      const detailsMap = new Map(
        detailsData.map((coin: any) => [coin.id, coin])
      );
  
      return {
        top_gainers: moversData.top_gainers.map((coin: any) => ({
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          image: coin.image,
          price: detailsMap.get(coin.id) ? (detailsMap.get(coin.id) as any).current_price : null,
          priceChange24h: (detailsMap.get(coin.id) as any)?.price_change_percentage_24h,
        })),
        top_losers: moversData.top_losers.map((coin: any) => ({
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          image: coin.image,
          price: (detailsMap.get(coin.id) as any)?.current_price,
          priceChange24h: (detailsMap.get(coin.id) as any)?.price_change_percentage_24h,
        }))
      };
    } catch (error) {
      console.error('Error fetching market data:', error);
      throw new Error('Failed to fetch market data');
    }
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
  
  export async function searchTokens(query: string) {
    const response = await fetch(
      `${COINGECKO_BASE_URL}/search?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'accept': 'application/json',
          'x-cg-pro-api-key': COINGECKO_API_KEY!
        },
      }
    );
  
    if (!response.ok) throw new Error('Failed to fetch search results');
    
    const data = await response.json();
    const topResults = data.coins.slice(0, 5);
    
    const enrichedResults = await Promise.all(
      topResults.map(async (coin: any): Promise<TokenSearchResult> => {
        let onchainData = null;
        let marketData = undefined;
        
        if (coin.platforms && Object.keys(coin.platforms).length > 0) {
          const [platform, address] = Object.entries(coin.platforms)[0] as [string, string];
          if (typeof address === 'string') {
            const [onchainDataResult, marketDataResult] = await Promise.all([
              fetchOnchainData(platform, address),
              fetchMarketData(platform, address)
            ]);
            onchainData = onchainDataResult;
            marketData = marketDataResult || {};
          }
        }
  
        const result: TokenSearchResult = {
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          marketCapRank: coin.market_cap_rank,
          thumb: coin.thumb,
          large: coin.large,
          platforms: coin.platforms,
          contractAddress: coin.platforms ? (Object.values(coin.platforms)[0] as string) : undefined,
        };

        if (onchainData) {
          result.onchainData = onchainData;
        }

        return result;


      })
    );
  
    return { coins: enrichedResults };
  }

  
  export async function getTotalCryptoMarketCap() {
    const response = await fetch(`${COINGECKO_BASE_URL}/global`, {
      headers: {
        'accept': 'application/json',
        'x-cg-pro-api-key': COINGECKO_API_KEY!
      },
    });
  
    if (!response.ok) throw new Error('Failed to fetch global market data');
    const data = await response.json();
  
    return {
      totalMarketCap: data.data.total_market_cap.usd,
      totalVolume: data.data.total_volume.usd,
      marketCapPercentage: data.data.market_cap_percentage,
      marketCapChange24h: data.data.market_cap_change_percentage_24h_usd,
      activeCryptocurrencies: data.data.active_cryptocurrencies,
      lastUpdated: data.data.updated_at
    };
  }

  export async function getSolanaTokenHolders(tokenAddresses: string[]) {
    // Validate input
    if (!tokenAddresses || !Array.isArray(tokenAddresses)) {
      throw new Error('Token addresses must be provided as an array');
    }
  
    // Validate address format
    const isValidAddress = (addr: string) => addr.length === 44 || addr.length === 43;
    if (!tokenAddresses.every(isValidAddress)) {
      throw new Error('Invalid Solana address format');
    }
  
    // Return empty array as per the route implementation
    return { data: [] };
  }

  export async function getMarketCategories() {
    const response = await fetch(`${COINGECKO_BASE_URL}/coins/categories`, {
      headers: {
        'accept': 'application/json',
        'x-cg-pro-api-key': COINGECKO_API_KEY!
      },
    });
  
    if (!response.ok) throw new Error('Failed to fetch category data');
    const data = await response.json();
  
    return data
      .sort((a: any, b: any) => b.market_cap - a.market_cap)
      .slice(0, 20)
      .map((category: any) => ({
        id: category.id,
        name: category.name,
        marketCap: category.market_cap,
        volume24h: category.volume_24h,
        topCoins: category.top_3_coins,
        change24h: category.market_cap_change_24h,
      }));
  }

  export async function getDerivativesExchanges() {
    const response = await fetch(
      `${COINGECKO_BASE_URL}/derivatives/exchanges?order=open_interest_btc_desc&per_page=20&page=1`,
      {
        headers: {
          'accept': 'application/json',
          'x-cg-pro-api-key': COINGECKO_API_KEY!
        },
      }
    );
  
    if (!response.ok) throw new Error('Failed to fetch derivatives exchanges data');
    return response.json();
  }

  export async function getTopHolders(address: string): Promise<TokenHolder[]> {
    try {
      const response = await fetch('https://pro-api.solscan.io/v2.0/token/holders?' + new URLSearchParams({
        address: address,
        page: '1',
        page_size: '10'  // Get top 10 holders
      }), {
        headers: {
          'token': process.env.SOLSCAN_API_KEY || ''
        }
      });
  
      if (!response.ok) {
        throw new Error('Failed to fetch token holders');
      }
  
      const result = await response.json();
      if (!result.success) {
        throw new Error('Failed to get holder data from Solscan');
      }
  
      return result.data.items.map((holder: any) => ({
        owner: holder.owner,
        amount: holder.amount,
        percentage: holder.percentage
      }));
  
    } catch (error) {
      console.error('Error fetching top holders:', error);
      throw error;
    }
  }


export async function swapTokens(inputMint: string, outputMint: string, amount: string) {
    if (!inputMint || !outputMint || !amount) {
      throw new Error('Missing parameters');
    }
  
    const quoteResponse = await fetch(
      `${JUPITER_API_URL}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}`
    );
  
    if (!quoteResponse.ok) throw new Error('Failed to get quote');
    return quoteResponse.json();
  }

  export async function getTransactionVolumeAndCount(timeframe: string) {
    const [volume, count] = await Promise.all([
      getTransactionVolume(),
      getTransactionCount()
    ]);
  
    return { volume, count };
  }