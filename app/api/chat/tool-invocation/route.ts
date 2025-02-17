import { NextResponse } from 'next/server';
import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient();

export async function POST(request: Request) {
  try {
    const { chatId, toolCallId, status, result } = await request.json();

    if (!chatId || !toolCallId) {
      return NextResponse.json(
        { error: 'Chat ID and Tool Call ID are required' },
        { status: 400 }
      );
    }

    // First, get all messages for this chat
    const queryParams = {
      TableName: 'ChatMessages',
      KeyConditionExpression: 'chatId = :chatId',
      ExpressionAttributeValues: {
        ':chatId': chatId
      }
    };

    const messages = await dynamodb.query(queryParams).promise();
    if (!messages.Items || messages.Items.length === 0) {
      return NextResponse.json(
        { error: 'Messages not found' },
        { status: 404 }
      );
    }

    // Find the specific message containing this tool invocation
    const message = messages.Items.find(msg => 
      msg.toolInvocations?.some((tool: any) => tool.toolCallId === toolCallId)
    );

    if (!message) {
      return NextResponse.json(
        { error: 'Tool invocation not found' },
        { status: 404 }
      );
    }

    // Update the specific tool invocation
    const updatedToolInvocations = message.toolInvocations.map((tool: any) => {
      if (tool.toolCallId === toolCallId) {
        return {
          ...tool,
          status,
          result: {
            ...tool.result,
            ...result,
            updatedAt: new Date().toISOString()
          }
        };
      }
      return tool;
    });

    // Update the message with the new tool invocations
    const updateParams = {
      TableName: 'ChatMessages',
      Key: {
        chatId: chatId,
        messageId: message.messageId
      },
      UpdateExpression: 'SET toolInvocations = :toolInvocations',
      ExpressionAttributeValues: {
        ':toolInvocations': updatedToolInvocations
      },
      ReturnValues: 'ALL_NEW'
    };

    await dynamodb.update(updateParams).promise();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating tool invocation:', error);
    return NextResponse.json(
      { error: 'Failed to update tool invocation' },
      { status: 500 }
    );
  }
}