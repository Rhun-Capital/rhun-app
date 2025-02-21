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
      // Optionally project only the attributes we need
      ProjectionExpression: "SK, fileName, fileType, uploadedAt, metadata, vectorIds"
    });

    const response = await docClient.send(command);
    
    // Transform the data to a more frontend-friendly format
    const items = response.Items?.map(item => {
      // Extract timestamp from SK
      const skParts = item.SK.split('#');
      const timestamp = skParts[3];

      return {
        id: item.SK,
        fileName: item.fileName,
        fileType: item.fileType,
        uploadedAt: timestamp,
        metadata: item.metadata || {},
        vectorCount: item.vectorIds?.length || 0
      };
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

// DELETE handler for removing knowledge
export async function DELETE(
  request: Request,
  { params }: { params: { agentId: string } }
) {
  const { agentId } = params;
  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get('fileName');
  const timestamp = searchParams.get('timestamp');

  if (!fileName || !timestamp) {
    return NextResponse.json(
      { error: 'fileName and timestamp are required' },
      { status: 400 }
    );
  }

  const sk = `fileName#${fileName}#timestamp#${timestamp}`;

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
      message: 'Successfully deleted knowledge entry and vectors',
      fileName,
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