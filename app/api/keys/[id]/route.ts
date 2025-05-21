import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

const dynamodb = DynamoDBDocumentClient.from(client);

// DELETE /api/keys/[id] - Delete an API key
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const userId = await verifyToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // First, verify that the key belongs to the user
    const key = await dynamodb.send(new GetCommand({
      TableName: 'ApiKeys',
      Key: {
        id: params.id
      }
    }));

    if (!key.Item || key.Item.userId !== userId) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Delete the key
    await dynamodb.send(new DeleteCommand({
      TableName: 'ApiKeys',
      Key: {
        id: params.id
      }
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to verify the token and get user ID
async function verifyToken(token: string): Promise<string | null> {
  try {
    const response = await fetch('https://auth.privy.io/api/v1/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PRIVY_APP_SECRET}`
      },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.userId;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
} 