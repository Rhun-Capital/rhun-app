import { NextResponse } from 'next/server';
import { initPinecone } from '@/utils/embeddings';

export async function GET(
  req: Request,
  { params }: { params: { agentId: string } }
) {
  try {
    const pinecone = initPinecone();
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

    // Try different vector approaches:
    const queryResponse = await index.query({
      vector: Array(1536).fill(0.1),  // Simple non-zero vector
      // Alternatively, try these other approaches:
      // vector: Array(1536).fill(1/1536),  // Normalized small values
      // vector: Array(1536).fill(Math.random()), // Random values
      topK: 1000,
      filter: {
        agentId: { $eq: params.agentId }
      },
      includeMetadata: true,
      includeValues: false  // Add this to exclude vector values from response
    });

    // Add debug logging
    console.log('Query response:', {
      matchCount: queryResponse.matches?.length || 0,
      firstMatch: queryResponse.matches?.[0],
      filter: { agentId: { $eq: params.agentId } }
    });

    const knowledge = queryResponse.matches?.map(match => ({
      id: match.id,
      metadata: match.metadata,
      score: match.score
    }));

    return NextResponse.json({ 
      knowledge,
      matchCount: knowledge?.length || 0  // Add count to response
    });
  } catch (error: any) {
    console.error('Error fetching knowledge:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch knowledge' },
      { status: 500 }
    );
  }
}