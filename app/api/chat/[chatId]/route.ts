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
      ExpressionAttributeValues: {
        ':chatId': params.chatId
      }
    };

    const result = await dynamodb.query(queryParams).promise();

    if (!result.Items || result.Items.length === 0) {
      return NextResponse.json({ messages: [] });
    }

    // Sort messages and preserve all tool invocation data
    const messages = result.Items
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map(item => ({
        messageId: item.messageId,
        createdAt: item.createdAt,
        role: item.role,
        content: item.content,
        toolInvocations: item.toolInvocations ? item.toolInvocations.map((tool: any) => ({
          ...tool,  // Preserve all tool data
          toolName: tool.toolName,
          toolCallId: tool.toolCallId,
          args: tool.args,
          result: tool.result
        })) : []
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

export async function POST(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const { userId, agentId, agentName, lastMessage, lastUpdated } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const chatParams = {
      TableName: 'Chats',
      Item: {
        chatId: params.chatId,
        userId,
        agentId,
        agentName,
        lastMessage,
        lastUpdated,
        createdAt: new Date().toISOString()
      }
    };

    await dynamodb.put(chatParams).promise();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating chat:', error);
    return NextResponse.json(
      { error: 'Failed to update chat' },
      { status: 500 }
    );
  }
}