// app/api/watchers/mark-read/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const dynamoDb = DynamoDBDocumentClient.from(client);

export async function POST(request: NextRequest) {
  try {
    const { userId, walletAddress, queryString } = await request.json();

    if (!userId || !walletAddress) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update the read status
    await dynamoDb.send(new PutCommand({
      TableName: 'SolanaMonitoring',
      Item: {
        pk: `USER#${userId}`,
        sk: `READSTATUS#${walletAddress}#${queryString}`,
        type: 'readStatus',
        walletAddress,
        userId,
        lastReadTimestamp: Date.now(),
        updatedAt: new Date().toISOString()
      }
    }));

    return NextResponse.json({ 
      message: 'Marked as read successfully',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error marking activities as read:', error);
    return NextResponse.json(
      { message: 'Failed to mark activities as read' },
      { status: 500 }
    );
  }
}