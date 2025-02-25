// app/api/knowledge/[agentId]/route.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  QueryCommand,
  DeleteCommand,
  GetCommand
} from "@aws-sdk/lib-dynamodb";
import { NextResponse } from 'next/server';
import { Pinecone } from "@pinecone-database/pinecone";

const ddbClient = new DynamoDBClient({ 
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const docClient = DynamoDBDocumentClient.from(ddbClient);

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

// Helper function to determine knowledge type from SK
const getKnowledgeTypeFromSK = (sk: string): 'file' | 'url' | 'text' => {
  if (sk.startsWith('fileName#')) return 'file';
  if (sk.startsWith('url#')) return 'url';
  if (sk.startsWith('text#')) return 'text';
  return 'file'; // Default fallback
};

// GET handler for fetching knowledge
export async function GET(
  request: Request,
  { params }: { params: { agentId: string } }
) {
  const { agentId } = params;

  try {
    const command = new QueryCommand({
      TableName: "Knowledge",
      KeyConditionExpression: "agentId = :agentId",
      ExpressionAttributeValues: {
        ":agentId": agentId
      },
      ScanIndexForward: false, // This will sort by SK in descending order (newest first)
    });

    const response = await docClient.send(command);
    
    // Transform the data to a more frontend-friendly format
    const items = response.Items?.map(item => {
      // Extract timestamp from SK
      const skParts = item.SK.split('#');
      const timestamp = skParts[3] || '';
      const knowledgeType = getKnowledgeTypeFromSK(item.SK);

      // Base item with common properties
      const baseItem = {
        id: item.SK,
        uploadedAt: timestamp,
        type: knowledgeType,
        metadata: item.metadata || {},
        vectorCount: item.vectorIds?.length || 0
      };

      // Add type-specific properties
      if (knowledgeType === 'file') {
        return {
          ...baseItem,
          fileName: item.fileName,
          fileType: item.fileType
        };
      } else if (knowledgeType === 'url') {
        return {
          ...baseItem,
          url: item.url,
          title: item.metadata?.title
        };
      } else if (knowledgeType === 'text') {
        return {
          ...baseItem,
          title: item.title,
          textPreview: item.textPreview
        };
      }

      return baseItem;
    });

    return NextResponse.json({
      items: items || [],
      count: response.Count || 0
    });

  } catch (error) {
    console.error('Error querying DynamoDB:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge base data' },
      { status: 500 }
    );
  }
}

// Helper function to determine SK format based on knowledge type
const constructSK = (params: {
  type: 'file' | 'url' | 'text';
  fileName?: string;
  url?: string;
  textId?: string;
  timestamp: string;
}): string => {
  const { type, fileName, url, textId, timestamp } = params;
  
  if (type === 'file' && fileName) {
    return `fileName#${fileName}#timestamp#${timestamp}`;
  } else if (type === 'url' && url) {
    return `url#${encodeURIComponent(url)}#timestamp#${timestamp}`;
  } else if (type === 'text' && textId) {
    return `text#${textId}#timestamp#${timestamp}`;
  }
  
  throw new Error('Invalid parameters for SK construction');
};

// DELETE handler for removing knowledge
export async function DELETE(
  request: Request,
  { params }: { params: { agentId: string } }
) {
  const { agentId } = params;
  const { searchParams } = new URL(request.url);
  
  // Get parameters based on knowledge type
  const fileName = searchParams.get('fileName');
  const url = searchParams.get('url');
  const textId = searchParams.get('textId');
  const timestamp = searchParams.get('timestamp');

  if (!timestamp) {
    return NextResponse.json(
      { error: 'timestamp is required' },
      { status: 400 }
    );
  }

  // Determine which type of knowledge we're deleting
  let sk: string;
  let knowledgeType: string;
  
  try {
    if (fileName) {
      sk = constructSK({ type: 'file', fileName, timestamp });
      knowledgeType = 'file';
    } else if (url) {
      sk = constructSK({ type: 'url', url, timestamp });
      knowledgeType = 'url';
    } else if (textId) {
      sk = constructSK({ type: 'text', textId, timestamp });
      knowledgeType = 'text';
    } else {
      return NextResponse.json(
        { error: 'One of fileName, url, or textId is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid parameters for knowledge deletion' },
      { status: 400 }
    );
  }

  try {
    // First, get the item to retrieve vectorIds
    const getResult = await docClient.send(
      new GetCommand({
        TableName: "Knowledge",
        Key: {
          agentId,
          SK: sk
        }
      })
    );

    if (!getResult.Item) {
      return NextResponse.json(
        { error: 'Knowledge entry not found' },
        { status: 404 }
      );
    }

    const vectorIds = getResult.Item.vectorIds || [];
    const itemIdentifier = getResult.Item.fileName || getResult.Item.url || getResult.Item.title || 'Unknown';

    // Delete vectors from Pinecone if there are any
    if (vectorIds.length > 0) {
      const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
      const namespaceIndex = index.namespace(agentId);

      // Delete vectors in batches of 100 (Pinecone's limit)
      const BATCH_SIZE = 100;
      for (let i = 0; i < vectorIds.length; i += BATCH_SIZE) {
        const batch = vectorIds.slice(i, i + BATCH_SIZE);
        await namespaceIndex.deleteMany(batch);
      }
    }

    // Delete from DynamoDB
    await docClient.send(
      new DeleteCommand({
        TableName: "Knowledge",
        Key: {
          agentId,
          SK: sk
        }
      })
    );

    return NextResponse.json({
      message: `Successfully deleted ${knowledgeType} knowledge entry and vectors`,
      identifier: itemIdentifier,
      type: knowledgeType,
      vectorsDeleted: vectorIds.length
    });

  } catch (error) {
    console.error('Error deleting knowledge:', error);
    return NextResponse.json(
      { error: 'Failed to delete knowledge entry' },
      { status: 500 }
    );
  }
}