// utils/s3.ts
import { S3 } from 'aws-sdk';

const s3 = new S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const CLOUDFRONT_DOMAIN = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;

export async function uploadToS3(file: Buffer, key: string, contentType?: string): Promise<string> {
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
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key
  };

  await s3.deleteObject(params).promise();
}

// Utility function to get S3 key from CloudFront URL
export function getKeyFromUrl(url: string): string {
  return url.replace(`https://${CLOUDFRONT_DOMAIN}/`, '');
}