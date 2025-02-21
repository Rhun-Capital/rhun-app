// app/api/chat/presigned/route.ts
import { NextResponse } from 'next/server';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({ 
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
}) as any;

export async function POST(request: Request) {
  try {
    const { fileName, contentType, chatId, messageId } = await request.json();
    
    const fileKey = `chat-attachments/${chatId}/${messageId}/${uuidv4()}-${fileName}`;

    console.log(process.env.S3_BUCKET_NAME)
    
    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: fileKey,
      Conditions: [
        ['content-length-range', 0, 10485760], // Up to 10MB
        ['starts-with', '$Content-Type', '']
      ],
      Fields: {
        'Content-Type': contentType
      },
      Expires: 300
    });

    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    return NextResponse.json({
      url,
      fields,
      fileUrl
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}