// app/api/scrape/route.ts
import { NextResponse } from 'next/server';
import { sendToUrlQueue } from '@/utils/sqs';

export async function POST(req: Request) {
  try {
    const { url, agentId } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    await sendToUrlQueue({
      url,
      agentId,
      metadata: {
        type: 'url',
        timestamp: new Date().toISOString(),
      }
    });

    return NextResponse.json({
      message: 'URL queued for processing',
      status: 'processing',
      url
    });

  } catch (error: any) {
    console.error('Error processing URL:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process URL'
    }, { status: 500 });
  }
}