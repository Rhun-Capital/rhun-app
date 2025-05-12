import { NextResponse } from 'next/server';
import { DynamoDB } from 'aws-sdk';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const dynamodb = new DynamoDB.DocumentClient();
const s3Client = new S3Client({ 
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
}) as any;

// Helper function to get presigned download URL from S3
async function getPresignedDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour expiry
}

// Helper function to get mime type from data URL
function getMimeType(dataUrl: string) {
  const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,/);
  if (matches && matches.length > 1) {
    return matches[1];
  }
  return 'application/octet-stream';
}

// Helper function to remove undefined values from an object
function removeUndefined(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}

// Helper function to get presigned URL for S3 upload
async function getPresignedUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

// Helper function to store data in S3
async function storeDataInS3(data: any, chatId: string, toolCallId: string) {
  const key = `chat-data/${chatId}/${toolCallId}.json`;
  
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: JSON.stringify(data),
    ContentType: 'application/json'
  }));

  return { key };
}

// Helper function to process tool invocations
async function processToolInvocations(toolInvocations: any[], chatId: string) {
  if (!toolInvocations) return undefined;

  return Promise.all(toolInvocations.map(async (invocation) => {
    // If result is too large (over 350KB), store in S3
    const resultSize = new TextEncoder().encode(JSON.stringify(invocation.result)).length;
    if (resultSize > 350000) {
      const s3Reference = await storeDataInS3(
        removeUndefined(invocation.result), 
        chatId, 
        invocation.toolCallId
      );
      
      return removeUndefined({
        toolName: invocation.toolName,
        toolCallId: invocation.toolCallId,
        args: invocation.args,
        status: invocation.status,
        result: {
          _storedInS3: true,
          _s3Reference: s3Reference,
          preview: 'Loading full result...'
        }
      });
    }
    
    // For regular results, preserve all data
    return removeUndefined({
      toolName: invocation.toolName,
      toolCallId: invocation.toolCallId,
      args: invocation.args,
      status: invocation.status,
      result: removeUndefined(invocation.result)
    });
  }));
}

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
      toolInvocations,
      attachments,
      isTemplate
    } = body;

    // Only require userId for non-template chats
    if (!isTemplate && !userId) {
      return NextResponse.json(
        { error: 'User ID is required for non-template chats' },
        { status: 400 }
      );
    }

    // Process attachments if they exist
    let processedAttachments;
    if (attachments && attachments.length > 0) {
      processedAttachments = await Promise.all(attachments.map(async (attachment: any) => {
        // Only process if it's a data URL
        if (attachment.url && attachment.url.startsWith('data:')) {
          const mimeType = getMimeType(attachment.url);
          const extension = mimeType.split('/')[1];
          const fileKey = `chat-attachments/${chatId}/${messageId}/${uuidv4()}.${extension}`;

          // Get presigned URL for upload
          const uploadUrl = await getPresignedUrl(fileKey, mimeType);
          
          // Return both the upload URL and the final S3 URL
          const finalUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
          
          return removeUndefined({
            name: attachment.name,
            contentType: attachment.contentType,
            uploadUrl, // Used by frontend to upload the file
            url: finalUrl, // Stored in DynamoDB
            key: fileKey // Store the key for future reference
          });
        }
        // If it's not a data URL, return as is
        return removeUndefined(attachment);
      }));
    }

    // Process tool invocations to handle large results
    const processedToolInvocations = await processToolInvocations(toolInvocations, chatId);

    const params = {
      TableName: 'ChatMessages',
      Item: removeUndefined({
        chatId,
        messageId,
        userId: userId || 'template', // Use 'template' as userId for template chats
        role,
        content,
        createdAt,
        isTemplate,
        toolInvocations: processedToolInvocations,
        ...(processedAttachments && { attachments: processedAttachments })
      })
    };

    try {
      await dynamodb.put(params).promise();
    } catch (error: any) {
      if (error.name === 'ValidationException' && error.message.includes('exceeded the maximum allowed size')) {
        console.warn('Message size exceeded DynamoDB limits, applying aggressive truncation');
        
        // Aggressive fallback: If we still get size exceeded, store very minimal data
        const minimalToolInvocations = await Promise.all(toolInvocations.map(async (invocation: any) => {
          // Store complete data in S3 regardless of size
          const s3Reference = await storeDataInS3(
            removeUndefined(invocation.result), 
            chatId, 
            invocation.toolCallId
          );
          
          return removeUndefined({
            toolName: invocation.toolName,
            toolCallId: invocation.toolCallId,
            args: invocation.args,
            status: invocation.status,
            result: {
              _storedInS3: true,
              _s3Reference: s3Reference,
              _emergencyFallback: true
            }
          });
        }));
        
        // Retry with minimal data
        await dynamodb.put({
          ...params,
          Item: removeUndefined({
            ...params.Item,
            toolInvocations: minimalToolInvocations
          })
        }).promise();
      } else {
        // If it's not a size issue, rethrow the error
        throw error;
      }
    }

    return NextResponse.json({ 
      success: true,
      attachments: processedAttachments 
    });
  } catch (error) {
    console.error('Error storing chat message:', error);
    return NextResponse.json(
      { error: 'Failed to store chat message' },
      { status: 500 }
    );
  }
}

// Add endpoint to fetch S3-stored tool results
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const bucket = searchParams.get('bucket');
    
    if (!key || !bucket) {
      return NextResponse.json({ error: 'Missing key or bucket parameter' }, { status: 400 });
    }
    
    // Generate a presigned URL for temporary access
    const presignedUrl = await getPresignedDownloadUrl(key);
    
    return NextResponse.json({ 
      url: presignedUrl 
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate data access URL' },
      { status: 500 }
    );
  }
}