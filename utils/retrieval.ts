import { createEmbedding, initPinecone } from './embeddings';

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