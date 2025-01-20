// app/api/chat/[chatId]/route.ts
import { NextResponse } from 'next/server';
import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient();

export async function GET(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const queryParams = {
      TableName: 'ChatMessages',
      KeyConditionExpression: 'chatId = :chatId',
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':chatId': params.chatId,
        ':userId': userId
      }
    };

    const result = await dynamodb.query(queryParams).promise();

    if (!result.Items || result.Items.length === 0) {
      return NextResponse.json({ messages: [] });
    }

    // Sort messages by createdAt timestamp
    const messages = result.Items
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map(item => ({
        id: item.messageId,
        createdAt: item.createdAt,
        role: item.role,
        content: item.content,
        toolInvocations: item.toolInvocations || [] // Include tool invocations in response
      }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}