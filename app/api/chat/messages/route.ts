import { NextResponse } from 'next/server';
import { DynamoDB } from 'aws-sdk';
import { uploadToS3 } from '@/utils/s3';
import { v4 as uuidv4 } from 'uuid';

const dynamodb = new DynamoDB.DocumentClient();

// Utility function to convert base64 to buffer
const base64toBuffer = (dataUrl: string) => {
  const base64Data = dataUrl.split(',')[1];
  return Buffer.from(base64Data, 'base64');
};

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
          const buffer = base64toBuffer(attachment.url);
          const mimeType = getMimeType(attachment.url);
          const extension = mimeType.split('/')[1];
          const key = `chat-attachments/${chatId}/${messageId}/${uuidv4()}.${extension}`;

          // Upload to S3 using our utility function
          const url = await uploadToS3(buffer, key);

          // Return the attachment with CloudFront URL instead of data URL
          return {
            name: attachment.name,
            contentType: attachment.contentType,
            url
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