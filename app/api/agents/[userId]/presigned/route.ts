// app/api/upload/[userId]/presigned/route.ts
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

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { fileName, fileType, type } = await request.json();
    
    // Generate unique file key
    const fileKey = type === 'profile-image' 
      ? `profile-images/${params.userId}/${uuidv4()}-${fileName}`
      : `uploads/${params.userId}/${uuidv4()}-${fileName}`;
    
    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: fileKey,
      Conditions: [
        ['content-length-range', 0, 5242880], // 5MB max for profile images
        ['starts-with', '$Content-Type', 'image/']
      ],
      Fields: {
        'Content-Type': fileType
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