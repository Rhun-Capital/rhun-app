import { NextResponse } from 'next/server';
import { DynamoDB } from 'aws-sdk';
import { getAgentConfig } from '@/utils/agent-tools';
import { uploadToS3, deleteFromS3, getKeyFromUrl } from '@/utils/s3';

const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export async function GET(
  request: Request,
  { params }: { params: { userId: string, agentId: string } }
) {
  try {
    const item = await getAgentConfig(params.userId, params.agentId);
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { userId: string; agentId: string } }
) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let agentData;
    let image: Blob | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      image = formData.get('image') as Blob | null;
      agentData = JSON.parse(formData.get('data') as string);
    } else if (contentType.includes('application/json')) {
      agentData = await request.json();
    } else {
      return NextResponse.json(
        { error: 'Unsupported content type. Use multipart/form-data or application/json' },
        { status: 400 }
      );
    }

    let imageUrl = agentData.imageUrl || '';

    if (image) {
      // Upload new image with timestamp to prevent caching
      const buffer = Buffer.from(await image.arrayBuffer());
      const key = `agents/${params.agentId}/profile.jpg`;
      imageUrl = await uploadToS3(buffer, key);
    }

    const finalAgentData = {
      ...agentData,
      imageUrl,
      updatedAt: new Date().toISOString(),
    };

    // Get current agent data
    const currentAgent = await dynamodb.get({
      TableName: 'Agents',
      Key: {
        id: params.agentId,
        userId: params.userId,
      }
    }).promise();

    if (!currentAgent.Item) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Merge current data with updates
    const mergedData = {
      ...currentAgent.Item,
      ...finalAgentData,
    };

    // Update the agent
    await dynamodb.put({
      TableName: 'Agents',
      Item: mergedData,
    }).promise();

    return NextResponse.json({
      message: 'Agent updated successfully',
      agent: mergedData
    });

  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { userId: string; agentId: string } }
) {
  try {
    // First, get the agent to check for image
    const currentAgent = await dynamodb.get({
      TableName: 'Agents',
      Key: {
        id: params.agentId,
        userId: params.userId
      }
    }).promise();

    if (!currentAgent.Item) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Delete the agent from DynamoDB
    await dynamodb.delete({
      TableName: 'Agents',
      Key: {
        id: params.agentId,
        userId: params.userId
      },
      ConditionExpression: 'attribute_exists(id)'
    }).promise();

    return NextResponse.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Error deleting agent:', error);

    if ((error as any).code === 'ConditionalCheckFailedException') {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
}