import { NextResponse } from 'next/server';
import { initPinecone } from '@/utils/embeddings';

export async function GET(
  req: Request,
  { params }: { params: { agentId: string } }
) {
  try {
    const pinecone = initPinecone();
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

    const stats = await index.describeIndexStats();
    console.log('Current index stats:', stats);
     
    // Create a random vector to query the index so that we dont cache
    const randomVector = new Array(1536).fill(0).map(x => Math.random() * 0.0001);

    // Query with the agentId filter
    const queryResponse = await index.query({
      vector: randomVector, //new Array(1536).fill(0),
      topK: 10000,
      filter: {
        agentId: params.agentId
      },
      includeMetadata: true,
      includeValues: false,
    });

    // Create a Map to handle duplicate sources (keyed by source+type)
    const sourcesMap = new Map<string, { source: string; type: string }>();
    
    for (const match of queryResponse.matches) {
      if (match.metadata) {
        const source = String(match.metadata.source) || 'unknown';
        const type = String(match.metadata.type) || 'unknown';
        
        // Use source+type as key to prevent duplicates
        const key = `${source}-${type}`;
        if (!sourcesMap.has(key)) {
          sourcesMap.set(key, { source, type });
        }
      }
    }

    // Convert Map to array and sort by source then type
    const uniqueSources = Array.from(sourcesMap.values())
      .sort((a, b) => {
        if (a.source === b.source) {
          return a.type.localeCompare(b.type);
        }
        return a.source.localeCompare(b.source);
      })
      .map(item => JSON.stringify(item));

    return NextResponse.json({ 
      knowledge: uniqueSources,
      total: queryResponse.matches.length
    });
  } catch (error: any) {
    console.error('Error fetching knowledge:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch knowledge' },
      { status: 500 }
    );
  }
}