// utils/s3.ts
import { S3 } from 'aws-sdk';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const CLOUDFRONT_DOMAIN = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;

export async function uploadToS3(file: Buffer, key: string, contentType?: string): Promise<string> {
  const params = {
    Bucket: process.env.S3_PUBLIC_BUCKET_NAME!,
    Key: key,
    Body: file,
    ContentType: contentType || 'image/jpeg', // Use provided content type or default to image/jpeg
  };

  await s3.upload(params).promise();
  
  // Return CloudFront URL instead of S3 URL
  return `https://${CLOUDFRONT_DOMAIN}/${key}`;
}

export async function uploadToPrivateS3(file: Buffer, key: string, contentType?: string): Promise<string> {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    Body: file,
    ContentType: contentType || 'image/jpeg', // Use provided content type or default to image/jpeg
  };

  await s3.upload(params).promise();
  
  // Return CloudFront URL instead of S3 URL
  return `https://${CLOUDFRONT_DOMAIN}/${key}`;
}

export async function deleteFromS3(key: string): Promise<void> {
  const params = {
    Bucket: process.env.S3_PUBLIC_BUCKET_NAME!,
    Key: key
  };

  await s3.deleteObject(params).promise();
}

// Utility function to get S3 key from CloudFront URL
export function getKeyFromUrl(url: string): string {
  return url.replace(`https://${CLOUDFRONT_DOMAIN}/`, '');
}


export function extractS3KeyFromUrl(url: string): string {
  try {
    // Create a URL object
    const parsedUrl = new URL(url);
    
    // Remove the domain part to get the S3 key
    // This works for both direct S3 URLs and Cloudfront distribution URLs
    const s3Key = decodeURIComponent(
      parsedUrl.pathname.startsWith('/') 
        ? parsedUrl.pathname.slice(1) 
        : parsedUrl.pathname
    );
    
    return s3Key;
  } catch (error) {
    console.error('Invalid URL:', url);
    throw new Error('Unable to extract S3 key from the provided URL');
  }
}

export async function getS3SignedUrl(url: string, expiresIn: number = 3600): Promise<string> {
  // Initialize S3 Client
  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
  }) as any;

  const key = extractS3KeyFromUrl(url);

  // Create a command to get the object
  const command = new GetObjectCommand({
    Bucket: process.env.S3_PUBLIC_BUCKET_NAME,
    Key: key
  });

  // Generate a signed URL
  return await getSignedUrl(s3Client, command, { expiresIn });
}