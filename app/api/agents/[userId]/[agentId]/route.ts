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
      const dataString = formData.get('data') as string;
      agentData = JSON.parse(dataString);
      console.log('Received form data:', { hasImage: !!image, agentData });
    } else if (contentType.includes('application/json')) {
      agentData = await request.json();
    } else {
      return NextResponse.json(
        { error: 'Unsupported content type. Use multipart/form-data or application/json' },
        { status: 400 }
      );
    }

    // Get current agent data first
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

    // Handle image URL
    let imageUrl = currentAgent.Item.imageUrl; // Keep existing image URL by default

    if (image) {
      // If there's a new image upload, handle it
      try {
        // Delete old image if it exists
        if (currentAgent.Item.imageUrl) {
          const oldKey = getKeyFromUrl(currentAgent.Item.imageUrl);
          if (oldKey) {
            await deleteFromS3(oldKey);
          }
        }

        // Upload new image
        const buffer = Buffer.from(await image.arrayBuffer());
        const timestamp = Date.now(); // Add timestamp to prevent caching
        const key = `agents/${params.agentId}/profile-${timestamp}.jpg`;
        imageUrl = await uploadToS3(buffer, key);
        console.log('New image uploaded:', imageUrl);
      } catch (error) {
        console.error('Error handling image:', error);
        return NextResponse.json(
          { error: 'Failed to process image upload' },
          { status: 500 }
        );
      }
    } else if (agentData.imageUrl === null) {
      // If imageUrl is explicitly set to null, delete the existing image
      if (currentAgent.Item.imageUrl) {
        const oldKey = getKeyFromUrl(currentAgent.Item.imageUrl);
        if (oldKey) {
          await deleteFromS3(oldKey);
        }
      }
      imageUrl = null;
    }

    const finalAgentData = {
      ...currentAgent.Item, // Start with current data
      ...agentData, // Apply updates
      imageUrl, // Use the determined image URL
      updatedAt: new Date().toISOString(),
    };

    // Update the agent
    await dynamodb.put({
      TableName: 'Agents',
      Item: finalAgentData,
    }).promise();

    return NextResponse.json({
      message: 'Agent updated successfully',
      data: finalAgentData
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