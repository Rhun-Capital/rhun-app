import { createEmbedding, initPinecone } from './embeddings';

export interface CoinData {
  id: string;
  name: string;
  symbol: string;
  description: string;
  current_price_usd: number;
  market_cap_usd: number;
  total_volume_usd: number;
  categories: string[];
  last_updated: string;
  score: number;
  thumb?: string;    // Add these
  small?: string;    // image
  large?: string;    // fields
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
    // Create embedding for the query
    const queryEmbedding = await createEmbedding(query);
    
    // Initialize Pinecone
    const pinecone = initPinecone();
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    // Query Pinecone
    const queryResponse = await index.query({
      vector: queryEmbedding,
      filter: { agentId: { $eq: agentId } },
      topK: maxResults,
      includeMetadata: true,
    });

    // Format results
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
  maxResults: number = 100
): Promise<CoinData[]> {
  try {
    // Initialize Pinecone
    const pinecone = initPinecone();
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    // Create a dummy vector if no query is provided
    const defaultVector = Array(1536).fill(0.1);

    // Prepare query parameters
    const queryParams = {
      vector: query ? await createEmbedding(query) : defaultVector,
      filter: { globalData: { $eq: true } },
      topK: maxResults,
      includeMetadata: true,
    };

    // Query Pinecone
    const queryResponse = await index.query(queryParams);

    // Format results
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

// For filtered queries without semantic search
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
  },
  maxResults: number = 10
): Promise<CoinData[]> {
  try {
    const pinecone = initPinecone();
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    // Build filter conditions
    const filterConditions: any[] = [
      { globalData: { $eq: true } }
    ];

    // Add market cap filters if provided
    if (filters.marketCap?.min !== undefined) {
      filterConditions.push({ market_cap_usd: { $gte: filters.marketCap.min } });
    }
    if (filters.marketCap?.max !== undefined) {
      filterConditions.push({ market_cap_usd: { $lte: filters.marketCap.max } });
    }

    // Existing filters...
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

    const defaultVector = Array(1536).fill(0.1);

    // Query Pinecone
    const queryResponse = await index.query({
      vector: defaultVector,
      filter: { $and: filterConditions },
      topK: maxResults,
      includeMetadata: true,
    });

    // Format results
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