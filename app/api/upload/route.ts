// app/api/upload/route.ts
import { NextResponse } from "next/server";
import { isRateLimited } from '@/utils/rate-limiter';
import { sendToTextQueue } from '@/utils/sqs';

export async function POST(req: Request) {
  try {
    const { text, source, type, agentId } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: "No text content provided" },
        { status: 400 }
      );
    }

    // Check rate limit (5 uploads per minute per source)
    const rateLimitKey = `upload_${source || 'unknown'}`;
    if (isRateLimited(rateLimitKey, 5, 60000)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a minute before trying again." },
        { status: 429 }
      );
    }

    // Queue text for processing
    await sendToTextQueue({
      text,
      source: source || "unknown",
      type: type || "text",
      agentId,
      metadata: {
        type: type || "text",
        timestamp: new Date().toISOString(),
        source: source || "unknown"
      }
    });

    return NextResponse.json({
      message: "Text content queued for processing",
      status: "processing"
    });

  } catch (error: any) {
    console.error("Error processing content:", error);
    return NextResponse.json(
      { error: error.message || "Error processing content" },
      { status: 500 }
    );
  }
}