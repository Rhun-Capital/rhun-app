// app/api/chats/recent/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const params = {
      TableName: 'Chats',
      IndexName: 'userChats-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Limit: 10,
      ScanIndexForward: false // This will get the most recent chats first
    };

    const result = await dynamodb.query(params).promise();

    // Convert the ISO string back to timestamp for the frontend
    const chats = result.Items?.map(item => ({
      chatId: item.chatId,
      agentId: item.agentId,
      agentName: item.agentName,
      lastMessage: item.lastMessage,
      lastUpdated: new Date(item.lastUpdated).getTime()
    }));

    return NextResponse.json({ chats });
  } catch (error) {
    console.error('Error fetching recent chats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent chats' },
      { status: 500 }
    );
  }
}