import { NextResponse } from 'next/server';
import { DynamoDB } from 'aws-sdk';

// For aws-sdk v2, we use different options format than v3
const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  convertEmptyValues: true
});

// Utility function to remove undefined values from objects
const removeUndefined = (obj: any): any => {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined).filter(item => item !== undefined);
  }
  
  return Object.entries(obj).reduce((acc: any, [key, value]) => {
    const processedValue = removeUndefined(value);
    if (processedValue !== undefined) {
      acc[key] = processedValue;
    }
    return acc;
  }, {});
};

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

    // Process the result to remove any undefined values
    const sanitizedResult = removeUndefined(result);

    // Update the specific tool invocation
    const updatedToolInvocations = message.toolInvocations.map((tool: any) => {
      if (tool.toolCallId === toolCallId) {
        const updatedTool = {
          ...tool,
          status,
          result: {
            ...removeUndefined(tool.result || {}),
            ...sanitizedResult,
            updatedAt: new Date().toISOString()
          }
        };
        return removeUndefined(updatedTool);
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

    try {
      const updatedMessage = await dynamodb.update(updateParams).promise();
      return NextResponse.json({
        success: true,
        message: updatedMessage.Attributes
      });
    } catch (updateError: any) {
      console.error('Error updating DynamoDB:', updateError);
      return NextResponse.json(
        { error: 'Failed to update tool invocation in database' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating tool invocation:', error);
    return NextResponse.json(
      { error: 'Failed to update tool invocation' },
      { status: 500 }
    );
  }
}