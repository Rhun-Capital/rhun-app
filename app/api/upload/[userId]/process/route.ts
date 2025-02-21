// app/api/upload/[userId]/process/route.ts
import { NextResponse } from 'next/server';
import { SQS } from '@aws-sdk/client-sqs';

const sqs = new SQS({ 
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const { fileKey, fileName, agentId, metadata } = await request.json();

    // Construct the S3 URL
    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    // Send message to SQS
    await sqs.sendMessage({
      QueueUrl: process.env.AWS_SQS_FILE_QUEUE_URL,
      MessageBody: JSON.stringify({
        fileUrl,
        fileName,
        agentId,
        metadata: {
          ...metadata,
          userId
        }
      })
    });

    return NextResponse.json({ 
      message: 'File queued for processing',
      fileUrl 
    });

  } catch (error) {
    console.error('Error queueing file for processing:', error);
    return NextResponse.json(
      { error: 'Failed to queue file for processing' },
      { status: 500 }
    );
  }
}