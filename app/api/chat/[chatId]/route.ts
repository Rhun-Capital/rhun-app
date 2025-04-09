import { NextResponse } from 'next/server';
import { DynamoDB } from 'aws-sdk';
import { getCloudFrontSignedUrl } from '@/utils/cloudfront';


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

    const isCloudFrontUrl = (url: string) => {
      return url.includes('.cloudfront.net');
    };
    
    const processAttachmentUrl = async (url: string) => {
      // If it's a CloudFront URL without a signature, return as-is
      if (isCloudFrontUrl(url)) {
        return url;
      }
      
      // Otherwise, generate a signed URL
      return await getCloudFrontSignedUrl(url);
    };
    
    const messages = await Promise.all(
      result.Items
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map(async (item) => ({
          messageId: item.messageId,
          createdAt: item.createdAt,
          role: item.role,
          content: item.content,
          // Use Promise.all to resolve attachment URLs
          ...(item.attachments && {
            attachments: await Promise.all(
              item.attachments.map(async (attachment: any) => ({
                name: attachment.name,
                url: await processAttachmentUrl(attachment.url),
                contentType: attachment.contentType
              }))
            )
          }),
          toolInvocations: item.toolInvocations ? item.toolInvocations.map((tool: any) => {
            // Check if the tool result is stored in S3 and preserve its reference
            if (tool.result && tool.result._storedInS3) {
              return {
                ...tool,
                toolName: tool.toolName,
                toolCallId: tool.toolCallId,
                args: tool.args,
                result: {
                  ...tool.result,
                  // Make sure to include the S3 reference
                  _storedInS3: true,
                  _s3Reference: tool.result._s3Reference,
                  _originalSize: tool.result._originalSize,
                  // Ensure we include preview data if available
                  ...(tool.result.seriesId && { seriesId: tool.result.seriesId }),
                  ...(tool.result.metadata && { metadata: tool.result.metadata }),
                  ...(tool.result.title && { title: tool.result.title }),
                  ...(tool.result.observations && { observations: tool.result.observations })
                }
              };
            }
            
            // Regular tool invocation result
            return {
              ...tool,
              toolName: tool.toolName,
              toolCallId: tool.toolCallId,
              args: tool.args,
              result: tool.result
            };
          }) : []
        }))
    );

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { 
      userId, 
      agentId, 
      agentName, 
      lastMessage, 
      lastUpdated, 
      chatId,
      attachments,
      isTemplate
    } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const chatParams = {
      TableName: 'Chats',
      Item: {
        chatId,
        userId,
        agentId,
        agentName,
        isTemplate,
        lastMessage,
        lastUpdated,
        createdAt: new Date().toISOString(),
        // Include attachments if they exist
        ...(attachments && { attachments })
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