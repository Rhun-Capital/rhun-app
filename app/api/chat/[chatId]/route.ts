import { NextResponse } from 'next/server';
import { DynamoDB } from 'aws-sdk';
import { getCloudFrontSignedUrl } from '@/utils/cloudfront';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const dynamodb = new DynamoDB.DocumentClient();
const s3Client = new S3Client({ 
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
}) as any;

interface QueryParams {
  TableName: string;
  KeyConditionExpression: string;
  ExpressionAttributeValues: { [key: string]: any };
  FilterExpression?: string;
}

// Helper function to get presigned URL for S3 data
async function getPresignedDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour expiry
}

export async function GET(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const isTemplate = searchParams.get('isTemplate') === 'true';

    // For template chats, we don't require a userId
    if (!isTemplate && !userId) {
      return NextResponse.json(
        { error: 'User ID is required for non-template chats' },
        { status: 400 }
      );
    }

    const queryParams: QueryParams = {
      TableName: 'ChatMessages',
      KeyConditionExpression: 'chatId = :chatId',
      ExpressionAttributeValues: {
        ':chatId': params.chatId
      }
    };

    // For template chats, add a filter for isTemplate = true
    if (isTemplate) {
      queryParams.FilterExpression = 'isTemplate = :isTemplate';
      queryParams.ExpressionAttributeValues[':isTemplate'] = true;
    }

    // For non-template chats, add a filter for userId
    if (!isTemplate && userId) {
      queryParams.FilterExpression = 'userId = :userId';
      queryParams.ExpressionAttributeValues[':userId'] = userId;
    }

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

    // Helper function to process tool invocations
    const processToolInvocations = async (toolInvocations: any[]) => {
      if (!toolInvocations) return [];

      return Promise.all(toolInvocations.map(async (tool: any) => {
        // Check if the tool result is stored in S3 and fetch it
        if (tool.result && tool.result._storedInS3) {
          try {
            // Get a presigned URL for the S3 data
            const presignedUrl = await getPresignedDownloadUrl(tool.result._s3Reference.key);
            
            // Fetch the actual data
            const response = await fetch(presignedUrl);
            if (!response.ok) throw new Error('Failed to fetch S3 data');
            
            const fullResult = await response.json();

            return {
              ...tool,
              toolName: tool.toolName,
              toolCallId: tool.toolCallId,
              args: tool.args,
              result: fullResult
            };
          } catch (error) {
            console.error('Error fetching S3 data for tool invocation:', error);
            // Return the tool with preview data if available
            return {
              ...tool,
              toolName: tool.toolName,
              toolCallId: tool.toolCallId,
              args: tool.args,
              result: {
                ...tool.result,
                error: 'Failed to load complete data'
              }
            };
          }
        }
        
        // Regular tool invocation result
        return {
          ...tool,
          toolName: tool.toolName,
          toolCallId: tool.toolCallId,
          args: tool.args,
          result: tool.result
        };
      }));
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
          toolInvocations: await processToolInvocations(item.toolInvocations)
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

    // Only require userId for non-template chats
    if (!isTemplate && !userId) {
      return NextResponse.json(
        { error: 'User ID is required for non-template chats' },
        { status: 400 }
      );
    }

    const chatParams = {
      TableName: 'Chats',
      Item: {
        chatId,
        userId: userId || 'template', // Use 'template' as userId for template chats
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