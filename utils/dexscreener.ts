/**
 * DexScreener API utility functions
 * 
 * This file provides a centralized interface for interacting with DEX Screener API endpoints.
 * Rate limits as per API documentation:
 * - Token profiles, boosts, orders: 60 requests per minute
 * - Pairs, search, token pairs: 300 requests per minute
 */

// Base API URL
const DEX_SCREENER_API_BASE = 'https://api.dexscreener.com';
const DEXSCREENER_API_URL = 'https://api.dexscreener.com/latest/dex';

// Cache configuration
const CACHE_TTL = 3600000; // 1 hour
let tokenMetadataCache: { [address: string]: any } = {};
let lastCacheCleanup = Date.now();

// Rate limiting configuration
const RATE_LIMITS = {
  tokenProfiles: {
    maxRequests: 60,
    timeWindow: 60000, // 1 minute
    currentRequests: 0,
    lastReset: Date.now()
  },
  pairs: {
    maxRequests: 300,
    timeWindow: 60000, // 1 minute
    currentRequests: 0,
    lastReset: Date.now()
  }
};

// =========================================
// Types and Interfaces
// =========================================

export interface DexScreenerTokenProfile {
  url: string;
  chainId: string;
  tokenAddress: string;
  icon?: string;
  header?: string;
  description?: string;
  links?: {
    type: string;
    label: string;
    url: string;
  }[];
}

export interface DexScreenerTokenBoost extends DexScreenerTokenProfile {
  amount: number;
  totalAmount: number;
}

export interface DexScreenerOrderStatus {
  type: string;
  status: string;
  paymentTimestamp: number;
}

export interface DexScreenerPairToken {
  address: string;
  name: string;
  symbol: string;
}

export interface DexScreenerTxns {
  [timeframe: string]: {
    buys: number;
    sells: number;
  };
}

export interface DexScreenerVolume {
  [timeframe: string]: number;
}

export interface DexScreenerPriceChange {
  [timeframe: string]: number;
}

export interface DexScreenerLiquidity {
  usd: number;
  base: number;
  quote: number;
}

export interface DexScreenerTokenInfo {
  imageUrl?: string;
  websites?: {
    url: string;
  }[];
  socials?: {
    platform: string;
    handle: string;
  }[];
}

export interface DexScreenerBoosts {
  active: number;
}

export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  labels?: string[];
  baseToken: DexScreenerPairToken;
  quoteToken: DexScreenerPairToken;
  priceNative: string;
  priceUsd: string;
  txns: DexScreenerTxns;
  volume: DexScreenerVolume;
  priceChange: DexScreenerPriceChange;
  liquidity: DexScreenerLiquidity;
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: DexScreenerTokenInfo;
  boosts?: DexScreenerBoosts;
}

export interface DexScreenerPairResponse {
  schemaVersion: string;
  pairs: DexScreenerPair[];
}

// Custom interface combining token data for our application
export interface DexScreenerToken {
  tokenAddress: string;
  chainId: string;
  name?: string;
  symbol?: string;
  url?: string;
  description?: string;
  icon?: string;
  price?: {
    value: number;
    formatted: string;
  };
  metrics?: {
    marketCap?: number;
    fullyDilutedValuation?: number;
    volume24h?: number;
    liquidity?: number;
    totalPairs?: number;
    buys24h?: number;
    sells24h?: number;
    totalTransactions24h?: number;
    buySellRatio?: number;
  };
  links?: {
    total: number;
    socialLinks: string[];
    websiteUrls: string[];
    otherLinks: {
      url: string;
      description: string;
    }[];
  };
  details?: {
    createdAt?: string;
    ageDays?: number;
    labels?: string[];
    uniqueDexes?: string[];
  };
  last_updated: string;
  score: number;
  network?: string;
}

// Interface for token retrieval filters
export interface DexScreenerTokenFilters {
  chainId?: string;
  minLinks?: number;
  hasDescription?: boolean;
  hasIcon?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minMarketCap?: number;
  maxMarketCap?: number;
  minVolume?: number;
  minAge?: number;
  maxAge?: number;
  minLiquidity?: number;
  hasLabels?: boolean;
  minBuySellRatio?: number;
  network?: string;
  searchText?: string; // Text search filter for name/symbol
}

// =========================================
// API Functions
// =========================================

/**
 * Get the latest token profiles
 * Rate limit: 60 requests per minute
 */
export async function getLatestTokenProfiles(): Promise<DexScreenerTokenProfile[]> {
  try {
    const response = await fetch(`${DEX_SCREENER_API_BASE}/token-profiles/latest/v1`);
    
    if (!response.ok) {
      throw new Error(`DEX Screener API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    console.error('Error fetching latest token profiles:', error);
    throw error;
  }
}

/**
 * Get the latest boosted tokens
 * Rate limit: 60 requests per minute
 */
export async function getLatestBoostedTokens(): Promise<DexScreenerTokenBoost[]> {
  try {
    const response = await fetch(`${DEX_SCREENER_API_BASE}/token-boosts/latest/v1`);
    
    if (!response.ok) {
      throw new Error(`DEX Screener API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    console.error('Error fetching latest boosted tokens:', error);
    throw error;
  }
}

/**
 * Get the tokens with most active boosts
 * Rate limit: 60 requests per minute
 */
export async function getTopBoostedTokens(): Promise<DexScreenerTokenBoost[]> {
  try {
    const response = await fetch(`${DEX_SCREENER_API_BASE}/token-boosts/top/v1`);
    
    if (!response.ok) {
      throw new Error(`DEX Screener API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    console.error('Error fetching top boosted tokens:', error);
    throw error;
  }
}

/**
 * Check orders paid for a token
 * Rate limit: 60 requests per minute
 * 
 * @param chainId - The chain ID (e.g., "solana")
 * @param tokenAddress - The token address
 */
export async function getTokenOrders(chainId: string, tokenAddress: string): Promise<DexScreenerOrderStatus[]> {
  try {
    const response = await fetch(`${DEX_SCREENER_API_BASE}/orders/v1/${chainId}/${tokenAddress}`);
    
    if (!response.ok) {
      throw new Error(`DEX Screener API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching orders for token ${tokenAddress} on ${chainId}:`, error);
    throw error;
  }
}

/**
 * Get one or multiple pairs by chain and pair address
 * Rate limit: 300 requests per minute
 * 
 * @param chainId - The chain ID (e.g., "solana")
 * @param pairId - The pair ID
 */
export async function getPairsByChainAndPairId(chainId: string, pairId: string): Promise<DexScreenerPairResponse> {
  try {
    const response = await fetch(`${DEX_SCREENER_API_BASE}/latest/dex/pairs/${chainId}/${pairId}`);
    
    if (!response.ok) {
      throw new Error(`DEX Screener API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching pair ${pairId} on ${chainId}:`, error);
    throw error;
  }
}

/**
 * Search for pairs matching query
 * Rate limit: 300 requests per minute
 * 
 * @param query - The search query (e.g., "SOL/USDC")
 */
export async function searchPairs(query: string): Promise<DexScreenerPairResponse> {
  try {
    const response = await fetch(`${DEX_SCREENER_API_BASE}/latest/dex/search?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`DEX Screener API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error searching for pairs with query "${query}":`, error);
    throw error;
  }
}

/**
 * Get the pools of a given token address
 * Rate limit: 300 requests per minute
 * 
 * @param chainId - The chain ID (e.g., "solana")
 * @param tokenAddress - The token address
 */
export async function getTokenPools(chainId: string, tokenAddress: string): Promise<DexScreenerPair[]> {
  try {
    const response = await fetch(`${DEX_SCREENER_API_BASE}/token-pairs/v1/${chainId}/${tokenAddress}`);
    
    if (!response.ok) {
      throw new Error(`DEX Screener API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching pools for token ${tokenAddress} on ${chainId}:`, error);
    throw error;
  }
}

/**
 * Get one or multiple pairs by token address
 * Rate limit: 300 requests per minute
 * 
 * @param chainId - The chain ID (e.g., "solana")
 * @param tokenAddresses - One or multiple comma-separated token addresses (up to 30)
 */
export async function getPairsByTokenAddresses(chainId: string, tokenAddresses: string): Promise<DexScreenerPair[]> {
  try {
    const response = await fetch(`${DEX_SCREENER_API_BASE}/tokens/v1/${chainId}/${tokenAddresses}`);
    
    if (!response.ok) {
      throw new Error(`DEX Screener API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching pairs for tokens ${tokenAddresses} on ${chainId}:`, error);
    throw error;
  }
}

/**
 * Transform DexScreener pair data into a more structured token format
 * 
 * @param pairs - Array of DexScreener pairs
 * @returns Array of structured DexScreener tokens
 */
export function transformPairsToTokens(pairs: DexScreenerPair[]): DexScreenerToken[] {
  const tokenMap = new Map<string, DexScreenerToken>();
  
  pairs.forEach(pair => {
    const baseToken = pair.baseToken;
    const tokenKey = `${pair.chainId}:${baseToken.address}`;
    
    // Skip if we already have info for this token with better data
    if (tokenMap.has(tokenKey) && tokenMap.get(tokenKey)?.metrics?.marketCap) {
      return;
    }
    
    // Extract transaction data for 24h metrics if available
    const txns24h = pair.txns['h24'] || { buys: 0, sells: 0 };
    const volume24h = pair.volume['h24'] || 0;
    const buySellRatio = txns24h.sells > 0 ? txns24h.buys / txns24h.sells : 0;
    
    // Calculate age in days if pairCreatedAt is available
    let ageDays: number | undefined;
    if (pair.pairCreatedAt) {
      const createdDate = new Date(pair.pairCreatedAt);
      const now = new Date();
      ageDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    // Convert price from string to number
    const priceValue = parseFloat(pair.priceUsd) || 0;
    
    // Extract social links and website URLs
    const socialLinks: string[] = [];
    const websiteUrls: string[] = [];
    const otherLinks: { url: string; description: string }[] = [];
    
    if (pair.info) {
      // Add websites
      if (pair.info.websites) {
        pair.info.websites.forEach(website => {
          if (website.url) websiteUrls.push(website.url);
        });
      }
      
      // Add socials
      if (pair.info.socials) {
        pair.info.socials.forEach(social => {
          if (social.platform && social.handle) {
            // Format based on platform
            let socialUrl = '';
            if (social.platform.toLowerCase() === 'twitter') {
              socialUrl = `https://twitter.com/${social.handle}`;
            } else if (social.platform.toLowerCase() === 'telegram') {
              socialUrl = `https://t.me/${social.handle}`;
            } else if (social.platform.toLowerCase() === 'discord') {
              socialUrl = social.handle;
            } else {
              // For other platforms, add to otherLinks with descriptive text
              otherLinks.push({
                url: social.handle,
                description: `${social.platform}`
              });
              return;
            }
            
            if (socialUrl) socialLinks.push(socialUrl);
          }
        });
      }
    }
    
    // Create token object
    const token: DexScreenerToken = {
      tokenAddress: baseToken.address,
      chainId: pair.chainId,
      name: baseToken.name,
      symbol: baseToken.symbol,
      url: pair.url,
      description: undefined, // DexScreener pairs don't include descriptions
      icon: pair.info?.imageUrl,
      price: {
        value: priceValue,
        formatted: `$${priceValue.toFixed(priceValue < 0.01 ? 6 : 2)}`
      },
      metrics: {
        marketCap: pair.marketCap,
        fullyDilutedValuation: pair.fdv,
        volume24h,
        liquidity: pair.liquidity.usd,
        totalPairs: 1, // We count each pair as one
        buys24h: txns24h.buys,
        sells24h: txns24h.sells,
        totalTransactions24h: txns24h.buys + txns24h.sells,
        buySellRatio
      },
      links: {
        total: socialLinks.length + websiteUrls.length + otherLinks.length,
        socialLinks,
        websiteUrls,
        otherLinks
      },
      details: {
        createdAt: pair.pairCreatedAt ? new Date(pair.pairCreatedAt).toISOString() : undefined,
        ageDays,
        labels: pair.labels,
        uniqueDexes: [pair.dexId]
      },
      last_updated: new Date().toISOString(),
      score: calculateTokenScore(pair),
      network: mapChainIdToNetwork(pair.chainId)
    };
    
    tokenMap.set(tokenKey, token);
  });
  
  return Array.from(tokenMap.values());
}

/**
 * Calculate a relevance score for a token based on its metrics
 * Higher score = more relevant
 * 
 * @param pair - DexScreener pair data
 * @returns Numeric score (0-100)
 */
function calculateTokenScore(pair: DexScreenerPair): number {
  let score = 50; // Default baseline score
  
  // Factors that increase score
  if (pair.liquidity?.usd) {
    if (pair.liquidity.usd > 1000000) score += 15;
    else if (pair.liquidity.usd > 100000) score += 10;
    else if (pair.liquidity.usd > 10000) score += 5;
  }
  
  if (pair.marketCap) {
    if (pair.marketCap > 10000000) score += 15;
    else if (pair.marketCap > 1000000) score += 10;
    else if (pair.marketCap > 100000) score += 5;
  }
  
  // Transaction activity
  const txns24h = pair.txns['h24'];
  if (txns24h) {
    const totalTxns = txns24h.buys + txns24h.sells;
    if (totalTxns > 1000) score += 15;
    else if (totalTxns > 100) score += 10;
    else if (totalTxns > 10) score += 5;
  }
  
  // Labels
  if (pair.labels && pair.labels.length > 0) {
    score += 5; // Having labels is generally good
    
    // Penalize for scam labels
    if (pair.labels.some(label => 
      label.toLowerCase().includes('scam') || 
      label.toLowerCase().includes('honeypot')
    )) {
      score -= 50;
    }
  }
  
  // Cap score at 0-100 range
  return Math.max(0, Math.min(100, score));
}

/**
 * Map chain ID to a user-friendly network name
 * 
 * @param chainId - The chain ID from DexScreener API
 * @returns Human-friendly network name
 */
function mapChainIdToNetwork(chainId: string): string {
  const networkMap: {[key: string]: string} = {
    'ethereum': 'Ethereum',
    'bsc': 'BNB Chain',
    'polygon': 'Polygon',
    'arbitrum': 'Arbitrum',
    'avalanche': 'Avalanche',
    'fantom': 'Fantom',
    'optimism': 'Optimism',
    'cronos': 'Cronos',
    'solana': 'Solana',
    'base': 'Base',
    'sei': 'Sei',
    'sui': 'Sui'
  };
  
  return networkMap[chainId.toLowerCase()] || chainId;
}

/**
 * Get recent DexScreener tokens with optional filtering
 * 
 * @param query - Optional semantic search query 
 * @param filters - Optional filters to apply
 * @param maxResults - Maximum number of results to return
 * @returns Array of filtered tokens
 */
export async function retrieveDexScreenerTokens(
  query?: string,
  filters?: DexScreenerTokenFilters,
  maxResults: number = 100
): Promise<DexScreenerToken[]> {
  try {
    // Default to searching all if no filter specified
    const chainId = filters?.chainId || 'solana';
    
    // Get pairs from DexScreener API based on whether we have a search query
    let pairs: DexScreenerPair[] = [];
    
    if (query) {
      // Search for pairs matching query
      const searchResult = await searchPairs(query);
      pairs = searchResult.pairs || [];
    } else {
      // If chainId is specified, get top tokens from that chain
      // This is a simplified approach - in a real implementation you might
      // want to retrieve tokens from multiple sources for better coverage
      
      // For this example, we'll get top pairs from major DEXes
      let pairsResult: DexScreenerPairResponse;
      
      if (chainId === 'solana') {
        // For Solana, get Raydium or Jupiter pairs
        pairsResult = await getPairsByChainAndPairId('solana', 'raydium');
        pairs = pairsResult.pairs || [];
        
        // If we don't have enough, get more from another Solana DEX
        if (pairs.length < 50) {
          const jupiterResult = await getPairsByChainAndPairId('solana', 'jupiter');
          pairs = [...pairs, ...(jupiterResult.pairs || [])];
        }
      } else if (chainId === 'ethereum') {
        // For Ethereum, get Uniswap pairs
        pairsResult = await getPairsByChainAndPairId('ethereum', 'uniswapv3');
        pairs = pairsResult.pairs || [];
      } else {
        // For other chains, search for popular tokens
        pairsResult = await searchPairs('USD');
        pairs = pairsResult.pairs.filter(pair => pair.chainId === chainId) || [];
      }
    }
    
    // Transform pairs to our token format
    let tokens = transformPairsToTokens(pairs);
    
    // Apply filters
    if (filters) {
      tokens = tokens.filter(token => {
        // Chain ID filter
        if (filters.chainId && token.chainId !== filters.chainId) {
          return false;
        }
        
        // Search text filter
        if (filters.searchText) {
          const searchText = filters.searchText.toLowerCase();
          const nameMatch = token.name?.toLowerCase().includes(searchText);
          const symbolMatch = token.symbol?.toLowerCase().includes(searchText);
          if (!nameMatch && !symbolMatch) {
            return false;
          }
        }
        
        // Links filter
        if (filters.minLinks && (!token.links || token.links.total < filters.minLinks)) {
          return false;
        }
        
        // Description filter
        if (filters.hasDescription === true && !token.description) {
          return false;
        }
        
        // Icon filter
        if (filters.hasIcon === true && !token.icon) {
          return false;
        }
        
        // Price filters
        if (filters.minPrice && (!token.price || token.price.value < filters.minPrice)) {
          return false;
        }
        if (filters.maxPrice && token.price && token.price.value > filters.maxPrice) {
          return false;
        }
        
        // Market cap filters
        if (filters.minMarketCap && (!token.metrics?.marketCap || token.metrics.marketCap < filters.minMarketCap)) {
          return false;
        }
        if (filters.maxMarketCap && token.metrics?.marketCap && token.metrics.marketCap > filters.maxMarketCap) {
          return false;
        }
        
        // Volume filter
        if (filters.minVolume && (!token.metrics?.volume24h || token.metrics.volume24h < filters.minVolume)) {
          return false;
        }
        
        // Liquidity filter
        if (filters.minLiquidity && (!token.metrics?.liquidity || token.metrics.liquidity < filters.minLiquidity)) {
          return false;
        }
        
        // Age filters
        if (filters.minAge && (!token.details?.ageDays || token.details.ageDays < filters.minAge)) {
          return false;
        }
        if (filters.maxAge && token.details?.ageDays && token.details.ageDays > filters.maxAge) {
          return false;
        }
        
        // Labels filter
        if (filters.hasLabels && (!token.details?.labels || token.details.labels.length === 0)) {
          return false;
        }
        
        // Buy/sell ratio filter
        if (filters.minBuySellRatio && (!token.metrics?.buySellRatio || token.metrics.buySellRatio < filters.minBuySellRatio)) {
          return false;
        }
        
        return true;
      });
    }
    
    // Limit results
    return tokens.slice(0, maxResults);
  } catch (error) {
    console.error('Error retrieving DexScreener tokens:', error);
    return [];
  }
}

// Rate limiting helper
function checkRateLimit(type: 'tokenProfiles' | 'pairs'): boolean {
  const limit = RATE_LIMITS[type];
  const now = Date.now();
  
  // Reset counter if time window has passed
  if (now - limit.lastReset > limit.timeWindow) {
    limit.currentRequests = 0;
    limit.lastReset = now;
  }
  
  // Check if we're under the limit
  if (limit.currentRequests >= limit.maxRequests) {
    return false;
  }
  
  // Increment counter
  limit.currentRequests++;
  return true;
}

// Wait helper
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Rate-limited fetch wrapper
async function rateLimitedFetch(url: string, type: 'tokenProfiles' | 'pairs', options?: RequestInit): Promise<Response> {
  // Wait until we're under the rate limit
  while (!checkRateLimit(type)) {
    await wait(1000); // Wait 1 second before retrying
  }
  
  const response = await fetch(url, options);
  
  // Handle rate limit errors
  if (response.status === 403) {
    console.warn(`Rate limit hit for ${type}, waiting before retry...`);
    await wait(5000); // Wait 5 seconds before retrying
    return rateLimitedFetch(url, type, options);
  }
  
  return response;
}

// Update the getTokenMetadataFromDexScreener function
async function getTokenMetadataFromDexScreener(address: string) {
  // Clean the cache occasionally
  const now = Date.now();
  if (now - lastCacheCleanup > CACHE_TTL) {
    tokenMetadataCache = {};
    lastCacheCleanup = now;
  }
  
  // Return cached data if available
  if (tokenMetadataCache[address]) {
    return tokenMetadataCache[address];
  }
  
  try {
    console.log(`Fetching token metadata from DexScreener for ${address}`);
    
    // Try first with the tokens endpoint
    let response = await rateLimitedFetch(`${DEXSCREENER_API_URL}/tokens/${address}`, 'tokenProfiles');
    
    // If that fails, try with the solana-specific endpoint
    if (!response.ok) {
      console.log(`Trying alternative DexScreener endpoint for Solana token: ${address}`);
      response = await rateLimitedFetch(`${DEXSCREENER_API_URL}/tokens/solana/${address}`, 'tokenProfiles');
    }
    
    if (!response.ok) {
      // If both fail, try one more approach with pairs endpoint
      console.log(`Trying token-pairs endpoint for token: ${address}`);
      response = await rateLimitedFetch(`https://api.dexscreener.com/token-pairs/v1/solana/${address}`, 'pairs');
      
      if (!response.ok) {
        throw new Error(`All DexScreener API endpoints failed: ${response.status}`);
      }
    }
    
    // ... rest of the existing function code ...
  } catch (error) {
    console.error('Error fetching from DexScreener:', error);
    return null;
  }
} 