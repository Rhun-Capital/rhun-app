import { NextResponse } from 'next/server';
import { initPinecone } from '@/utils/embeddings';

export async function GET(
  req: Request,
  { params }: { params: { agentId: string } }
) {
  try {
    const pinecone = initPinecone();
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);
    
    // Use namespace instead of filter
    const namespace = params.agentId;
    const namespaceIndex = index.namespace(namespace);

    // Get stats to verify namespace exists
    const stats = await index.describeIndexStats();
    const namespaces = stats.namespaces || {};
    
    // Create a random vector to query the index so that we don't cache
    const randomVector = new Array(1536).fill(0).map(x => Math.random() * 0.0001);

    // Query within the namespace - no need for agentId filter anymore
    const queryResponse = await namespaceIndex.query({
      vector: randomVector,
      topK: 100,
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
    const namespace = params.agentId;

    // Check if namespace exists
    const stats = await index.describeIndexStats();

    // Create a random vector to query the index
    const randomVector = new Array(1536).fill(0).map(x => Math.random() * 0.0001);

    // Use the namespace-specific query method
    const namespaceIndex = index.namespace(namespace);
    const queryResponse = await namespaceIndex.query({
      vector: randomVector,
      topK: 1000,
      filter: {
        source: source,
        type: type
      },
      includeMetadata: false,
      includeValues: false,
    });

    if (queryResponse.matches.length === 0) {
      return NextResponse.json(
        { error: 'No matching vectors found' },
        { status: 404 }
      );
    }

    // Get all IDs
    const ids = queryResponse.matches.map(match => match.id);
    
    // Perform individual deletions which is the most compatible approach
    // Process in smaller batches to avoid overwhelming the API
    const batchSize = 100;
    let deletedCount = 0;
    
    for (let i = 0; i < ids.length; i += batchSize) {
      const batchIds = ids.slice(i, i + batchSize);
      const deletePromises = batchIds.map(id => {
        // Delete using the namespace-specific method
        return namespaceIndex.deleteOne(id);
      });
      
      try {
        await Promise.all(deletePromises);
        deletedCount += batchIds.length;
        console.log(`Deleted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(ids.length/batchSize)}`);
      } catch (batchError) {
        console.error(`Error deleting batch ${Math.floor(i/batchSize) + 1}:`, batchError);
        // Continue with next batch despite errors
      }
    }

    return NextResponse.json({
      success: true,
      method: 'individual_id_delete',
      deletedCount: deletedCount
    });
    
  } catch (error: any) {
    console.error('Error deleting knowledge:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete knowledge' },
      { status: 500 }
    );
  }
}