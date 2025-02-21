// app/api/agents/[userId]/signed/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getS3SignedUrl } from '@/utils/s3'; // Server-side utility

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const signedUrl = await getS3SignedUrl(url);
    
    return NextResponse.json({ signedUrl });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate signed URL' }, 
      { status: 500 }
    );
  }
}