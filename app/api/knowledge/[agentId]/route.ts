import { NextResponse } from 'next/server';
import { initPinecone } from '@/utils/embeddings';

export async function GET(
  req: Request,
  { params }: { params: { agentId: string } }
) {
  try {
    const pinecone = await initPinecone();
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

    // Query Pinecone for all vectors with matching agentId
    const queryResponse = await index.query({
      vector: new Array(1536).fill(0), // Dummy vector for metadata-only query
      topK: 1000,
      filter: {
        agentId: { $eq: params.agentId }
      },
      includeMetadata: true
    });

    const knowledge = queryResponse.matches?.map(match => ({
      id: match.id,
      metadata: match.metadata,
      score: match.score
    }));

    return NextResponse.json({ knowledge });
  } catch (error: any) {
    console.error('Error fetching knowledge:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch knowledge' },
      { status: 500 }
    );
  }
}