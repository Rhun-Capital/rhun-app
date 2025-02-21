// app/api/upload/[userId]/presigned/route.ts
import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client outside of the handler
const s3Client = new S3Client({ 
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
}) as any; // Type assertion to avoid version mismatch issues

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const { fileName, fileType, agentId } = await request.json();

    // Generate a unique file key
    const timestamp = Date.now();
    const fileKey = `knowledge/${userId}/${agentId}/${timestamp}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType,
      Metadata: {
        agentId
      }
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300
    });

    return NextResponse.json({ 
      uploadUrl,
      fileKey
    });

  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}