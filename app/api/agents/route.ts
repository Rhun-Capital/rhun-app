// app/api/agents/route.ts
import { NextResponse } from 'next/server';
import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { uploadToS3 } from '@/utils/s3';

const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

async function getUserIdFromApiKey(apiKey: string): Promise<string> {
  // Query the ApiKeys table using a GSI on the key field
  const result = await dynamodb.scan({
    TableName: 'ApiKeys',
    FilterExpression: '#key = :key',
    ExpressionAttributeNames: {
      '#key': 'key'
    },
    ExpressionAttributeValues: {
      ':key': apiKey
    }
  }).promise();

  if (!result.Items || result.Items.length === 0) {
    throw new Error('Invalid API key');
  }

  // Update the lastUsed timestamp
  const apiKeyRecord = result.Items[0];
  await dynamodb.update({
    TableName: 'ApiKeys',
    Key: {
      userId: apiKeyRecord.userId,
      id: apiKeyRecord.id
    },
    UpdateExpression: 'SET lastUsed = :now',
    ExpressionAttributeValues: {
      ':now': new Date().toISOString()
    }
  }).promise();

  return apiKeyRecord.userId;
}

export async function POST(request: Request) {
  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from request headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);
    let agentData;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const image = formData.get('image') as Blob | null;
      agentData = JSON.parse(formData.get('data') as string);
      
      if (image) {
        const buffer = Buffer.from(await image.arrayBuffer());
        const key = `agents/${agentData.id || uuidv4()}/profile.jpg`;
        agentData.imageUrl = await uploadToS3(buffer, key);
      }
    } else if (contentType.includes('application/json')) {
      agentData = await request.json();
      console.log('Received JSON data:', agentData);
    } else {
      return NextResponse.json(
        { error: 'Unsupported content type. Use multipart/form-data or application/json' },
        { status: 400 }
      );
    }

    const agentId = agentData.id || uuidv4();
    const finalAgentData = {
      id: agentId,
      userId, // Add the user ID from the request headers
      timestamp: new Date().toISOString(),
      ...agentData
    };

    console.log('Attempting to save to DynamoDB:', {
      tableName: 'Agents',
      item: finalAgentData,
      awsConfig: {
        region: process.env.AWS_REGION,
        hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    await dynamodb.put({
      TableName: 'Agents',
      Item: finalAgentData
    }).promise();

    return NextResponse.json({
      message: 'Agent created successfully',
      agentId: finalAgentData.id,
      userId: finalAgentData.userId,
      imageUrl: finalAgentData.imageUrl
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating agent:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return NextResponse.json(
      { error: 'Failed to create agent', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

