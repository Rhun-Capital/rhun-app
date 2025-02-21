import { NextResponse } from 'next/server';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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
}));

// Get presigned URL for upload
async function getPresignedUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType
  });

  return getSignedUrl(s3Client, command, { expiresIn: 300 });
}

// Utility function to get MIME type from data URL
const getMimeType = (dataUrl: string) => {
  return dataUrl.split(',')[0].split(':')[1].split(';')[0];
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
          
          return {
            name: attachment.name,
            contentType: attachment.contentType,
            uploadUrl, // Used by frontend to upload the file
            url: finalUrl, // Stored in DynamoDB
            key: fileKey // Store the key for future reference
          };
        }
        // If it's not a data URL, return as is
        return attachment;
      }));
    }

    const params = {
      TableName: 'ChatMessages',
      Item: {
        chatId,
        messageId,
        userId,
        role,
        content,
        createdAt,
        isTemplate,
        toolInvocations: toolInvocations || [],
        ...(processedAttachments && { attachments: processedAttachments })
      }
    };

    await ddbClient.put(params);

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