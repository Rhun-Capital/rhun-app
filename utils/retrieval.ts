import { resourceLimits } from 'node:worker_threads';
import { createEmbedding, initPinecone } from './embeddings';
import { RecordMetadata, RecordMetadataValue } from '@pinecone-database/pinecone';

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
  market_cap: string;
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

    const queryResponse = await index.query({
      vector: queryEmbedding,
      filter: { agentId: { $eq: agentId } },
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
      filter: { globalData: { $eq: true } },
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
  maxResults: number = 28
): Promise<TrendingCoinData[]> {
  try {
    const pinecone = initPinecone();
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    const queryResponse = await index.query({
      vector: Array(1536).fill(0.1),
      filter: { isTrending: { $eq: true } },
      topK: maxResults,
      includeMetadata: true,
    });

    const results = queryResponse.matches?.map(match => ({
      id: match.metadata?.id as string,
      name: match.metadata?.name as string,
      symbol: match.metadata?.symbol as string,
      price_usd: match.metadata?.price_usd as number,
      market_cap: match.metadata?.market_cap as string,
      total_volume: match.metadata?.total_volume as string,
      last_updated: match.metadata?.last_updated as string,
      score: match.score ?? 0,
      thumb: match.metadata?.thumb as string,
      small: match.metadata?.small as string,
      large: match.metadata?.large as string,
      market_cap_rank: match.metadata?.market_cap_rank as number,
      price_change_percentage_24h: match.metadata?.price_change_percentage_24h as number,
      sparkline: match.metadata?.sparkline as string,
      content_description: match.metadata?.content_description as string
    })) || [];

    return results.sort((a, b) => (a.market_cap_rank || Infinity) - (b.market_cap_rank || Infinity));
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
    nameContains?: string;
    marketCap?: {
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
      { globalData: { $eq: true } }
    ];

    if (filters.marketCap?.min !== undefined) {
      filterConditions.push({ market_cap_usd: { $gte: filters.marketCap.min } });
    }
    if (filters.marketCap?.max !== undefined) {
      filterConditions.push({ market_cap_usd: { $lte: filters.marketCap.max } });
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
    if (filters.nameContains) {
      filterConditions.push({ name: { $contains: filters.nameContains } });
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