// app/api/chats/update/route.ts
import { NextResponse } from 'next/server';
import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chatId, userId, agentId, agentName, lastMessage, lastUpdated } = body;

    // Convert timestamp to ISO string for consistent sorting
    const lastUpdatedString = new Date(lastUpdated).toISOString();

    const params = {
      TableName: 'Chats',
      Item: {
        userId,
        chatId,
        agentId,
        agentName,
        lastMessage,
        lastUpdated: lastUpdatedString  // Store as string
      }
    };

    await dynamodb.put(params).promise();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating chat:', error);
    return NextResponse.json(
      { error: 'Failed to update chat' },
      { status: 500 }
    );
  }
}