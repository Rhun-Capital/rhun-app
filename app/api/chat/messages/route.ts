// app/api/chat/messages/route.ts
import { NextResponse } from 'next/server';
import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      chatId, 
      messageId, 
      userId, 
      role, 
      content, 
      createdAt,
      toolInvocations  // Add this to accept tool invocations
    } = body;

    const params = {
      TableName: 'ChatMessages',
      Item: {
        chatId,
        messageId,
        userId,
        role,
        content,
        createdAt,
        toolInvocations: toolInvocations || [] // Store tool invocations, default to empty array
      }
    };

    await dynamodb.put(params).promise();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error storing chat message:', error);
    return NextResponse.json(
      { error: 'Failed to store chat message' },
      { status: 500 }
    );
  }
}