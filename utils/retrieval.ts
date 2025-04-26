import { resourceLimits } from 'node:worker_threads';
import { createEmbedding, initPinecone } from './embeddings';
import { RecordMetadataValue } from '@pinecone-database/pinecone';
import { QueryResponse, RecordMetadata, ScoredPineconeRecord } from '@pinecone-database/pinecone';
import * as DexScreener from './dexscreener';

// Base interface for common coin data
interface BaseCoinData {
  id: string;
  name: string;
  symbol: string;
  description?: string;
  thumb?: string;
  small?: string;
  large?: string;
  categories?: string[];
  last_updated: string;
  score: number;
}

interface TrendingFilters {
  minPrice?: number;
  maxPrice?: number;
  minMarketCap?: number;
  maxMarketCap?: number;
  minVolume?: number;
  minPriceChange?: number;
  sortBy?: 'trending' | 'price_change' | 'market_cap' | 'volume';
}

// Interface for regular coin data
export interface CoinData extends BaseCoinData {
  current_price_usd: number;
  market_cap_usd: number;
  total_volume_usd: number;
  activated_at?: number;
  contract_address?: string;
  twitter?: string;
  homepage?: string;
}

// Interface specifically for trending coins
export interface TrendingCoinData extends BaseCoinData {
  price_usd: number;
  market_cap: number;
  total_volume: string;
  price_change_percentage_24h: number;
  market_cap_rank: number;
  sparkline?: string;
  content_description?: string;
}

export interface RetrievedContext {
  text: string;
  source: string;
  score: number;
}

interface SolanaMetrics {
  metadata: Record<string, any>;  // Raw metrics data
  timestamp: string;
  score: number;
}

// Interface for NFT price data
interface NftPrice {
  native_currency: number;
  usd: number;
}

// Interface for NFT percentage change data
interface NftPercentageChange {
  native_currency: number;
  usd: number;
}

// Interface for NFT image data
interface NftImage {
  small: string;
  small_2x: string;
}

// Interface for Solana token data
export interface SolanaTrendingData {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  icon?: string;
  holder?: number;
  price?: number;
  total_volume?: number;
  volume_24h?: number;
  market_cap?: number;
  market_cap_rank?: number;
  price_change_24h?: number;
  description?: string;
  twitter?: string;
  website?: string;
  creator?: string;
  supply?: string;
  last_updated: string;
  score: number;
}

// Define Pinecone response types
interface PineconeMetadata {
  tokenAddress?: string;
  chainId?: string;
  token_name_lower?: string;
  header?: string;
  token_symbol_lower?: string;
  dexScreenerUrl?: string;
  icon?: string;
  image_url?: string;
  description?: string;
  last_updated?: string;
  network?: string;
  price_usd?: number;
  market_cap?: number;
  fully_diluted_valuation?: number;
  volume_24h?: number;
  liquidity_usd?: number;
  total_pairs?: number;
  buys_24h?: number;
  sells_24h?: number;
  total_txns_24h?: number;
  social_links?: string[];
  website_urls?: string[];
  link_urls?: string[];
  link_descriptions?: string[];
  created_at?: number;
  age_days?: number;
  labels?: string[];
  unique_dexes?: string[];
}

interface PineconeMatch {
  id: string;
  score: number;
  values?: number[];
  metadata?: PineconeMetadata;
}

interface PineconeQueryResponse {
  matches?: PineconeMatch[];
  namespace?: string;
}

export interface CryptoNewsArticle {
  id: string;
  title: string;
  body: string;
  url: string;
  published_on: number;
  published_date: string;
  image_url?: string;
  source_name?: string;
  sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  categories?: string[];
  keywords?: string[];
  score: number;
}

export interface NewsFilters {
  searchText?: string;
  sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  categories?: string[];
  source?: string;
  minPublishedDate?: string;
  maxPublishedDate?: string;
  includeKeywords?: string[];
  excludeKeywords?: string[];
}

export async function retrieveTrendingSolanaTokens(
  query?: string,
  filters?: {
    minPrice?: number;
    maxPrice?: number;
    minMarketCap?: number;
    maxMarketCap?: number;
    minHolders?: number;
    minVolume?: number;
  },
  maxResults: number = 100
): Promise<SolanaTrendingData[]> {
  try {
    const pinecone = initPinecone();
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    // Base filter conditions for Solana trending tokens
    const filterConditions: any[] = [
      { isTrendingSolana: { $eq: true } },
      { network: { $eq: 'solana' } }
    ];

    // Add optional filters
    if (filters) {
      if (filters.minPrice !== undefined) {
        filterConditions.push({ price: { $gte: filters.minPrice } });
      }
      if (filters.maxPrice !== undefined) {
        filterConditions.push({ price: { $lte: filters.maxPrice } });
      }
      if (filters.minMarketCap !== undefined) {
        filterConditions.push({ market_cap: { $gte: filters.minMarketCap } });
      }
      if (filters.maxMarketCap !== undefined) {
        filterConditions.push({ market_cap: { $lte: filters.maxMarketCap } });
      }
      if (filters.minHolders !== undefined) {
        filterConditions.push({ holder: { $gte: filters.minHolders } });
      }
      if (filters.minVolume !== undefined) {
        filterConditions.push({ volume_24h: { $gte: filters.minVolume } });
      }
    }

    const queryParams = {
      vector: query ? await createEmbedding(query) : Array(1536).fill(0.1),
      filter: { $and: filterConditions },
      topK: maxResults,
      includeMetadata: true,
    };

    const queryResponse = await index.query(queryParams);

    const results = queryResponse.matches?.map(match => ({
      address: match.metadata?.address as string,
      name: match.metadata?.name as string,
      symbol: match.metadata?.symbol as string,
      decimals: match.metadata?.decimals as number,
      icon: match.metadata?.icon as string,
      holder: match.metadata?.holder as number,
      price: match.metadata?.price as number,
      volume_24h: match.metadata?.volume_24h as number,
      market_cap: match.metadata?.market_cap as number,
      market_cap_rank: match.metadata?.market_cap_rank as number,
      price_change_24h: match.metadata?.price_change_24h as number,
      description: match.metadata?.description as string,
      twitter: match.metadata?.twitter as string,
      website: match.metadata?.website as string,
      creator: match.metadata?.creator as string,
      supply: match.metadata?.supply as string,
      last_updated: match.metadata?.last_updated as string,
      score: match.score ?? 0,
    })) || [];

    // Sort by market cap rank if available, then by score
    return results.sort((a, b) => {
      if (a.market_cap_rank !== undefined && b.market_cap_rank !== undefined) {
        return a.market_cap_rank - b.market_cap_rank;
      }
      return b.score - a.score;
    });

  } catch (error) {
    console.error('Error retrieving Solana trending tokens:', error);
    return [];
  }
}

// Interface for NFT data
export interface NftData {
  id: string;
  name: string;
  symbol: string;
  description: string;
  asset_platform_id: string;
  contract_address: string;
  native_currency: string;
  native_currency_symbol: string;
  total_supply: number;
  
  // Price and market data
  floor_price: NftPrice;
  market_cap: NftPrice;
  volume_24h: NftPrice;
  
  // Percentage changes
  floor_price_24h_percentage_change: NftPercentageChange;
  market_cap_24h_percentage_change: NftPercentageChange;
  volume_24h_percentage_change: NftPercentageChange;
  floor_price_in_usd_24h_percentage_change: number;
  volume_in_usd_24h_percentage_change: number;
  
  // Sales and holder metrics
  one_day_sales: number;
  one_day_sales_24h_percentage_change: number;
  one_day_average_sale_price: number;
  one_day_average_sale_price_24h_percentage_change: number;
  number_of_unique_addresses: number;
  number_of_unique_addresses_24h_percentage_change: number;
  
  // Images
  image: NftImage;
  
  // Metadata
  timestamp: string;
  score: number;
}

export async function retrieveNfts(
  query?: string,
  filters?: {
    minFloorPrice?: number;
    maxFloorPrice?: number;
    minMarketCap?: number;
    maxMarketCap?: number;
    platform?: string;
    minVolume?: number;
    minHolders?: number;
  },
  maxResults: number = 200
): Promise<NftData[]> {
  try {
    const pinecone = initPinecone();
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    // Base filter condition to identify NFT records
    const filterConditions: any[] = [
      // Check for presence of NFT-specific fields
      { "floor_price.usd": { $exists: true } },
      { "number_of_unique_addresses": { $exists: true } }
    ];

    // Add optional filters
    if (filters) {
      if (filters.minFloorPrice !== undefined) {
        filterConditions.push({ "floor_price.usd": { $gte: filters.minFloorPrice } });
      }
      if (filters.maxFloorPrice !== undefined) {
        filterConditions.push({ "floor_price.usd": { $lte: filters.maxFloorPrice } });
      }
      if (filters.minMarketCap !== undefined) {
        filterConditions.push({ "market_cap.usd": { $gte: filters.minMarketCap } });
      }
      if (filters.maxMarketCap !== undefined) {
        filterConditions.push({ "market_cap.usd": { $lte: filters.maxMarketCap } });
      }
      if (filters.platform !== undefined) {
        filterConditions.push({ asset_platform_id: { $eq: filters.platform } });
      }
      if (filters.minVolume !== undefined) {
        filterConditions.push({ "volume_24h.usd": { $gte: filters.minVolume } });
      }
      if (filters.minHolders !== undefined) {
        filterConditions.push({ number_of_unique_addresses: { $gte: filters.minHolders } });
      }
    }

    const queryParams = {
      vector: query ? await createEmbedding(query) : Array(1536).fill(0.1),
      filter: { $and: filterConditions },
      topK: maxResults,
      includeMetadata: true,
    };

    const queryResponse = await index.query(queryParams);

    const results = queryResponse.matches?.map(match => ({
      id: match.metadata?.id as string,
      name: match.metadata?.name as string,
      symbol: match.metadata?.symbol as string,
      description: match.metadata?.description as string,
      asset_platform_id: match.metadata?.asset_platform_id as string,
      contract_address: match.metadata?.contract_address as string,
      native_currency: match.metadata?.native_currency as string,
      native_currency_symbol: match.metadata?.native_currency_symbol as string,
      total_supply: match.metadata?.total_supply as number,
      
      floor_price: {
        native_currency: match.metadata?.["floor_price.native_currency"] as number,
        usd: match.metadata?.["floor_price.usd"] as number,
      },
      market_cap: {
        native_currency: match.metadata?.["market_cap.native_currency"] as number,
        usd: match.metadata?.["market_cap.usd"] as number,
      },
      volume_24h: {
        native_currency: match.metadata?.["volume_24h.native_currency"] as number,
        usd: match.metadata?.["volume_24h.usd"] as number,
      },
      
      floor_price_24h_percentage_change: {
        native_currency: match.metadata?.["floor_price_24h_percentage_change.native_currency"] as number,
        usd: match.metadata?.["floor_price_24h_percentage_change.usd"] as number,
      },
      market_cap_24h_percentage_change: {
        native_currency: match.metadata?.["market_cap_24h_percentage_change.native_currency"] as number,
        usd: match.metadata?.["market_cap_24h_percentage_change.usd"] as number,
      },
      volume_24h_percentage_change: {
        native_currency: match.metadata?.["volume_24h_percentage_change.native_currency"] as number,
        usd: match.metadata?.["volume_24h_percentage_change.usd"] as number,
      },
      
      floor_price_in_usd_24h_percentage_change: match.metadata?.floor_price_in_usd_24h_percentage_change as number,
      volume_in_usd_24h_percentage_change: match.metadata?.volume_in_usd_24h_percentage_change as number,
      
      one_day_sales: match.metadata?.one_day_sales as number,
      one_day_sales_24h_percentage_change: match.metadata?.one_day_sales_24h_percentage_change as number,
      one_day_average_sale_price: match.metadata?.one_day_average_sale_price as number,
      one_day_average_sale_price_24h_percentage_change: match.metadata?.one_day_average_sale_price_24h_percentage_change as number,
      number_of_unique_addresses: match.metadata?.number_of_unique_addresses as number,
      number_of_unique_addresses_24h_percentage_change: match.metadata?.number_of_unique_addresses_24h_percentage_change as number,
      
      image: {
        small: match.metadata?.["image.small"] as string,
        small_2x: match.metadata?.["image.small_2x"] as string,
      },
      
      timestamp: match.metadata?.timestamp as string,
      score: match.score ?? 0,
    })) || [];

    return results;
  } catch (error) {
    console.error('Error retrieving NFTs:', error);
    return [];
  }
}

export async function retrieveSolanaMetrics(
  query: string,
  maxResults: number = 5
): Promise<SolanaMetrics[]> {
  try {
    const pinecone = initPinecone();
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    const queryEmbedding = await createEmbedding(query);

    const queryResponse = await index.query({
      vector: queryEmbedding,
      filter: { 
        source: { $eq: "solana-metrics.csv" }
      },
      topK: maxResults,
      includeMetadata: true,
    });

    return queryResponse.matches?.map(match => ({
      metadata: match.metadata as Record<string, any>,
      timestamp: match.metadata?.timestamp as string,
      score: match.score || 0
    })) || [];
  } catch (error) {
    console.error('Error retrieving Solana metrics:', error);
    return [];
  }
}

// Helper function to get the most recent value for a specific metric
export async function getLatestMetric(metricName: string): Promise<number | string | null> {
  const results = await retrieveSolanaMetrics(`${metricName}`, 1);
  if (results.length > 0) {
    // Find the closest matching metric name
    const metricKey = Object.keys(results[0].metadata)
      .find(key => key.toLowerCase().includes(metricName.toLowerCase()));
    
    return metricKey ? results[0].metadata[metricKey] : null;
  }
  return null;
}

// Helper function to get multiple metrics at once
export async function getLatestMetrics(metricNames: string[]): Promise<Record<string, any>> {
  const results = await retrieveSolanaMetrics(metricNames.join(" "), 1);
  if (results.length > 0) {
    const metrics: Record<string, any> = {};
    
    metricNames.forEach(name => {
      const metricKey = Object.keys(results[0].metadata)
        .find(key => key.toLowerCase().includes(name.toLowerCase()));
      
      if (metricKey) {
        metrics[name] = results[0].metadata[metricKey];
      }
    });
    
    return metrics;
  }
  return {};
}

export async function retrieveContext(
  query: string,
  agentId: string,
  maxResults: number = 5
): Promise<RetrievedContext[]> {
  try {
    const queryEmbedding = await createEmbedding(query);
    const pinecone = initPinecone();
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
    
    // Get the namespace for this agent
    const namespaceIndex = index.namespace(agentId);

    const queryResponse = await namespaceIndex.query({
      vector: queryEmbedding,
      topK: maxResults,
      includeMetadata: true,
    });

    const results = queryResponse.matches?.map(match => ({
      text: match.metadata?.text as string,
      source: match.metadata?.source as string,
      score: match.score ?? 0,
    })) || [];

    return results;
  } catch (error) {
    console.error('Error retrieving context:', error);
    return [];
  }
}

export async function retrieveCoins(
  query?: string,
  maxResults: number = 200
): Promise<CoinData[]> {
  try {
    const pinecone = initPinecone();
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    const defaultVector = Array(1536).fill(0.1);
    const queryParams = {
      vector: query ? await createEmbedding(query) : defaultVector,
      filter: { isRecent: { $eq: true } },
      topK: maxResults,
      includeMetadata: true,
    };

    const queryResponse = await index.query(queryParams);

    const results = queryResponse.matches?.map(match => ({
      id: match.metadata?.id as string,
      name: match.metadata?.name as string,
      symbol: match.metadata?.symbol as string,
      description: match.metadata?.description as string,
      current_price_usd: match.metadata?.current_price_usd as number,
      market_cap_usd: match.metadata?.market_cap_usd as number,
      total_volume_usd: match.metadata?.total_volume_usd as number,
      categories: match.metadata?.categories as string[],
      last_updated: match.metadata?.last_updated as string,
      activated_at: match.metadata?.activated_at as number,
      contract_address: match.metadata?.contract_address as string,
      twitter: match.metadata?.twitter as string,
      homepage: match.metadata?.homepage as string,
      score: match.score ?? 0,
      thumb: match.metadata?.thumb as string,
      small: match.metadata?.small as string,
      large: match.metadata?.large as string,
    })) || [];

    return results;
  } catch (error) {
    console.error('Error retrieving coins:', error);
    return [];
  }
}

export async function retrieveTrendingCoins(
  filters?: TrendingFilters,
  maxResults: number = 100
): Promise<TrendingCoinData[]> {
  try {
    const pinecone = initPinecone();
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    // Build filter conditions
    const filterConditions: any[] = [
      { isTrending: { $eq: true } },
    ];

    if (filters) {
      if (filters.minPrice !== undefined) {
        filterConditions.push({ price_usd: { $gte: filters.minPrice } });
      }
      if (filters.maxPrice !== undefined) {
        filterConditions.push({ price_usd: { $lte: filters.maxPrice } });
      }
      if (filters.minMarketCap !== undefined) {
        filterConditions.push({ market_cap: { $gte: filters.minMarketCap } });
      }
      if (filters.maxMarketCap !== undefined) {
        filterConditions.push({ market_cap: { $lte: filters.maxMarketCap } });
      }
      if (filters.minVolume !== undefined) {
        filterConditions.push({ total_volume: { $gte: filters.minVolume } });
      }
      if (filters.minPriceChange !== undefined) {
        filterConditions.push({ price_change_percentage_24h: { $gte: filters.minPriceChange } });
      }
    }

    const queryResponse = await index.query({
      vector: Array(1536).fill(0.1),
      filter: { $and: filterConditions },
      topK: maxResults,
      includeMetadata: true,
    });

    const results = queryResponse.matches?.map(match => ({
      id: match.metadata?.id as string,
      name: match.metadata?.name as string,
      symbol: match.metadata?.symbol as string,
      price_usd: match.metadata?.price_usd as number,
      market_cap: match.metadata?.market_cap as number,
      total_volume: match.metadata?.total_volume as string,
      last_updated: match.metadata?.last_updated as string,
      score: match.score ?? 0,
      thumb: match.metadata?.thumb as string,
      market_cap_rank: match.metadata?.market_cap_rank as number,
      price_change_percentage_24h: match.metadata?.price_change_percentage_24h as number,
      sparkline: match.metadata?.sparkline as string,
      content_description: match.metadata?.content_description as string,
      isTrending: match.metadata?.isTrending as boolean
    })) || [];

    // Apply sorting
    if (filters?.sortBy) {
      switch (filters.sortBy) {
        case 'price_change':
          results.sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0));
          break;
        case 'market_cap':
          results.sort((a, b) => {
            const aMarketCap = Number(a.market_cap) || 0;
            const bMarketCap = Number(b.market_cap) || 0;
            return bMarketCap - aMarketCap;
          });
          break;
        case 'volume':
          results.sort((a, b) => {
            const aVolume = Number(a.total_volume?.replace(/[$,]/g, '')) || 0;
            const bVolume = Number(b.total_volume?.replace(/[$,]/g, '')) || 0;
            return bVolume - aVolume;
          });
          break;
        default:
          // Default sorting by market cap rank
          results.sort((a, b) => (a.market_cap_rank || Infinity) - (b.market_cap_rank || Infinity));
      }
    } else {
      // Default sorting by market cap rank
      results.sort((a, b) => (a.market_cap_rank || Infinity) - (b.market_cap_rank || Infinity));
    }

    return results;
  } catch (error) {
    console.error('Error retrieving trending coins:', error);
    return [];
  }
}

export async function retrieveCoinsWithFilters(
  filters: {
    minPrice?: number;
    maxPrice?: number;
    categories?: string[];
    marketCap?: {
      min?: number;
      max?: number;
    };
    volume?: {
      min?: number;
      max?: number;
    };
    timeRange?: {
      hours?: number;
      days?: number;
    };
  },
  maxResults: number = 200
): Promise<CoinData[]> {
  try {
    const pinecone = initPinecone();
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    const filterConditions: any[] = [
      { isRecent: { $eq: true } }
    ];

    if (filters.marketCap?.min !== undefined) {
      filterConditions.push({ market_cap_usd: { $gte: filters.marketCap.min } });
    }
    if (filters.marketCap?.max !== undefined) {
      filterConditions.push({ market_cap_usd: { $lte: filters.marketCap.max } });
    }

    // Add volume filters
    if (filters.volume?.min !== undefined) {
      filterConditions.push({ total_volume_usd: { $gte: filters.volume.min } });
    }
    if (filters.volume?.max !== undefined) {
      filterConditions.push({ total_volume_usd: { $lte: filters.volume.max } });
    }

    if (filters.timeRange) {
      const now = Math.floor(Date.now() / 1000);
      let timeThreshold = now;

      if (filters.timeRange.hours) {
        timeThreshold = now - (filters.timeRange.hours * 3600);
      } else if (filters.timeRange.days) {
        timeThreshold = now - (filters.timeRange.days * 86400);
      }

      filterConditions.push({ activated_at: { $gte: timeThreshold } });
    }

    if (filters.minPrice !== undefined) {
      filterConditions.push({ current_price_usd: { $gte: filters.minPrice } });
    }
    if (filters.maxPrice !== undefined) {
      filterConditions.push({ current_price_usd: { $lte: filters.maxPrice } });
    }
    if (filters.categories?.length) {
      filterConditions.push({ categories: { $in: filters.categories } });
    }
    // if (filters.nameContains) {
    //   filterConditions.push({ name: { $contains: filters.nameContains } });
    // }

    const queryResponse = await index.query({
      vector: Array(1536).fill(0.1),
      filter: { $and: filterConditions },
      topK: maxResults,
      includeMetadata: true,
    });

    const results = queryResponse.matches?.map(match => ({
      id: match.metadata?.id as string,
      name: match.metadata?.name as string,
      symbol: match.metadata?.symbol as string,
      description: match.metadata?.description as string,
      current_price_usd: match.metadata?.current_price_usd as number,
      market_cap_usd: match.metadata?.market_cap_usd as number,
      total_volume_usd: match.metadata?.total_volume_usd as number,
      categories: match.metadata?.categories as string[],
      last_updated: match.metadata?.last_updated as string,
      activated_at: match.metadata?.activated_at as number,
      contract_address: match.metadata?.contract_address as string,
      twitter: match.metadata?.twitter as string,
      homepage: match.metadata?.homepage as string,
      score: match.score ?? 0,
      thumb: match.metadata?.thumb as string,
      small: match.metadata?.small as string,
      large: match.metadata?.large as string,
    })) || [];

    return results;
  } catch (error) {
    console.error('Error retrieving filtered coins:', error);
    return [];
  }
}

/**
 * Retrieve tokens from DexScreener with optional filtering
 * This is now a wrapper around the dexscreener.ts implementation
 * 
 * @param semanticQuery - Optional semantic search query
 * @param filters - Optional filters to apply
 * @param maxResults - Maximum number of results to return
 * @param namespaceDate - Namespace date (unused in new implementation)
 * @returns Array of filtered tokens
 */
export async function retrieveDexScreenerTokens(
  semanticQuery?: string,
  filters?: DexScreener.DexScreenerTokenFilters,
  maxResults: number = 100,
  namespaceDate?: string
): Promise<DexScreener.DexScreenerToken[]> {
  try {
    // Call the implementation from dexscreener.ts
    return await DexScreener.retrieveDexScreenerTokens(semanticQuery, filters, maxResults);
  } catch (error) {
    console.error('Error retrieving DexScreener tokens:', error);
    return [];
  }
}

/**
 * Retrieves crypto news articles from Pinecone with optional semantic search and filtering
 * 
 * @param semanticQuery - Natural language query for semantic search
 * @param maxResults - Maximum number of results to return
 * @returns Array of news articles matching the query 
 */
export async function retrieveCryptoNews(
  semanticQuery: string,
  filters?: any, // Kept for compatibility but not used
  maxResults: number = 20
): Promise<CryptoNewsArticle[]> {
  try {
    console.log('Retrieving crypto news articles with semantic query:', semanticQuery);
    
    // Initialize Pinecone
    const pinecone = initPinecone();
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    // Use the latest news namespace
    const namespace = 'latest_crypto_news';
    const namespaceIndex = index.namespace(namespace);
    
    console.log(`Querying news namespace: ${namespace}`);

    // Create embedding from semantic query
    const queryVector = await createEmbedding(semanticQuery);
    
    // Fixed query parameters format
    // The error indicates topK should be a scalar value, not an object
    const queryParams = {
      vector: queryVector,
      topK: parseInt(String(maxResults)), // Ensure topK is a number
      includeMetadata: true
    };

    // Query the namespace
    const queryResponse = await namespaceIndex.query(queryParams);

    return mapResponseToNewsArticles(queryResponse);

  } catch (error) {
    console.error('Error retrieving crypto news:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return [];
  }
}

/**
 * Maps Pinecone query response to CryptoNewsArticle objects
 */
function mapResponseToNewsArticles(queryResponse: any): CryptoNewsArticle[] {
  if (!queryResponse.matches || queryResponse.matches.length === 0) {
    return [];
  }

  return queryResponse.matches.map((match: any) => {
    const metadata = match.metadata;
    
    return {
      id: metadata.id || match.id,
      title: metadata.title || 'Unknown Title',
      body: metadata.body || '',
      url: metadata.url || '',
      published_on: metadata.published_on || 0,
      published_date: metadata.published_date || '',
      image_url: metadata.image_url,
      source_name: metadata.source_name,
      sentiment: metadata.sentiment,
      categories: metadata.categories || [],
      keywords: metadata.keywords || [],
      score: match.score || 0
    };
  });
}