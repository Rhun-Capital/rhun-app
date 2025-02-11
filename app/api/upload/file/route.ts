// app/api/upload/file/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { sendToFileQueue } from '@/utils/sqs';

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const agentId = formData.get('agentId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Generate a unique file key
    const fileKey = `knowledge/${agentId}/${file.name}`;
    
    // Upload to S3
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: fileKey,
      Body: buffer,
      ContentType: file.type,
    }));

    // Get S3 URL
    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    // Queue processing
    await sendToFileQueue({
      fileUrl,
      fileName: file.name,
      agentId,
      metadata: {
        type: file.name.endsWith('.csv') ? 'csv' : 'document',
        timestamp: new Date().toISOString(),
      }
    });
    

    return NextResponse.json({
      message: 'File uploaded and queued for processing',
      status: 'processing',
      fileUrl
    });

  } catch (error: any) {
    console.error('Error uploading file:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Error uploading file' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}