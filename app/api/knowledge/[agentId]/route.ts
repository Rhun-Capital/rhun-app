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
     
    // Create a random vector to query the index so that we dont cache
    const randomVector = new Array(1536).fill(0).map(x => Math.random() * 0.0001);

    // Query with the agentId filter
    const queryResponse = await index.query({
      vector: randomVector, //new Array(1536).fill(0),
      topK: 100,
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

export async function DELETE(
  req: Request,
  { params }: { params: { agentId: string } }
) {
  try {
    const { source, type } = await req.json();
    
    if (!source || !type) {
      return NextResponse.json(
        { error: 'Source and type are required' },
        { status: 400 }
      );
    }

    const pinecone = initPinecone();
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

    // Create a random vector to query the index
    const randomVector = new Array(1536).fill(0).map(x => Math.random() * 0.0001);

    // First, query to get all matching vectors
    const queryResponse = await index.query({
      vector: randomVector,
      topK: 10000,
      filter: {
        agentId: params.agentId,
        source: source,
        type: type
      },
      includeMetadata: true,
      includeValues: false,
    });

    if (queryResponse.matches.length === 0) {
      return NextResponse.json(
        { error: 'No matching vectors found' },
        { status: 404 }
      );
    }

    try {
      // Delete each vector individually
      const deletePromises = queryResponse.matches.map(match => 
        index.deleteOne(match.id)
      );
      
      await Promise.all(deletePromises);

      return NextResponse.json({
        success: true,
        deletedCount: queryResponse.matches.length
      });
    } catch (deleteError: any) {
      console.error('Specific deletion error:', deleteError);
      return NextResponse.json(
        { 
          error: 'Failed to delete vectors',
          details: deleteError.message 
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error deleting knowledge:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete knowledge' },
      { status: 500 }
    );
  }
}