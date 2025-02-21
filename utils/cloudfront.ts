// utils/cloudfront.ts
import { CloudFront } from 'aws-sdk';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';

const cloudfront = new CloudFront.Signer(
  process.env.CLOUDFRONT_KEY_PAIR_ID!,
  process.env.CLOUDFRONT_PRIVATE_KEY!
);

export async function getCloudFrontSignedUrl(s3Url: string) {
    try {
      if (!s3Url) return null;
  
      // Extract just the path from the S3 URL
      const pathMatch = s3Url.match(/amazonaws\.com\/(.*)/);
      const path = pathMatch ? pathMatch[1] : '';
      
      // Construct CloudFront URL with just the path
      const cloudfrontUrl = `${process.env.CLOUDFRONT_DOMAIN}/${path}`;
  
      const privateKey = process.env.CLOUDFRONT_PRIVATE_KEY!.replace(/\\n/g, '\n');
      
      // Sign URL
      const signedUrl = getSignedUrl({
        url: cloudfrontUrl,
        keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID!,
        dateLessThan: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        privateKey
      });
  
      return signedUrl;
    } catch (error) {
      console.error('Error signing CloudFront URL:', error);
      return s3Url; // Fallback to original URL
    }
  }