import { NextResponse } from 'next/server';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({ 
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
}) as any;

const ddbClient = DynamoDBDocument.from(new DynamoDB({ 
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
}), {
  marshallOptions: {
    removeUndefinedValues: true
  }
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

// Get presigned URL for upload
async function getPresignedUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType
  });

  return getSignedUrl(s3Client, command, { expiresIn: 300 });
}

// Get presigned URL for download
async function getPresignedDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour expiry
}

// Store large data in S3
async function storeDataInS3(data: any, chatId: string, toolCallId: string) {
  const key = `tool-results/${chatId}/${toolCallId}.json`;
  
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: JSON.stringify(data),
    ContentType: 'application/json'
  }));
  
  return {
    bucket: process.env.S3_BUCKET_NAME,
    key: key
  };
}

// Utility function to get MIME type from data URL
const getMimeType = (dataUrl: string) => {
  return dataUrl.split(',')[0].split(':')[1].split(';')[0];
};

// Helper function to process tool invocations and store large data in S3
const processToolInvocations = async (toolInvocations: any[] = [], chatId: string) => {
  if (!toolInvocations || toolInvocations.length === 0) return [];
  
  const processedInvocations = await Promise.all(toolInvocations.map(async invocation => {
    // Deep clone the invocation to avoid modifying the original and remove any undefined values
    const processedInvocation = removeUndefined(JSON.parse(JSON.stringify(invocation)));
    
    // Check if this is a FRED data result or other large data
    if (processedInvocation.result) {
      const resultSize = JSON.stringify(processedInvocation.result).length;
      
      // If the result is larger than 100KB, store it in S3
      if (resultSize > 100000) {
        
        // Store the full result in S3
        const s3Reference = await storeDataInS3(
          processedInvocation.result, 
          chatId, 
          processedInvocation.toolCallId
        );
        
        // Replace the full result with a minimal reference plus preview data
        processedInvocation.result = {
          _storedInS3: true,
          _s3Reference: s3Reference,
          _originalSize: resultSize,
          
          // For FRED data, include a preview with essential metadata and a few observations
          ...(processedInvocation.toolName === 'getFredSeries' ? {
            seriesId: processedInvocation.result.seriesId,
            metadata: removeUndefined(processedInvocation.result.metadata),
            title: processedInvocation.result.title,
            // Include a small preview of observations
            observations: processedInvocation.result.observations?.slice(-10) || []
          } : {})
        };
      }
    }
    
    return processedInvocation;
  }));
  
  return processedInvocations;
};

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
        userId,
        role,
        content,
        createdAt,
        isTemplate,
        toolInvocations: processedToolInvocations,
        ...(processedAttachments && { attachments: processedAttachments })
      })
    };

    try {
      await ddbClient.put(params);
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
        await ddbClient.put({
          ...params,
          Item: removeUndefined({
            ...params.Item,
            toolInvocations: minimalToolInvocations
          })
        });
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