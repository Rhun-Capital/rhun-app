import { createEmbedding, initPinecone } from './embeddings';

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