import { NextResponse } from "next/server";
import { initPinecone, createEmbedding, chunkText } from "@/utils/embeddings";
import { isRateLimited } from '@/utils/rate-limiter';

export async function POST(req: Request) {
  try {
    const { text, source, type } = await req.json();

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

    // Initialize Pinecone
    const pinecone = await initPinecone();
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

    // Split text into chunks
    const chunks = chunkText(text);

    // Create embeddings for each chunk
    const vectors = await Promise.all(
      chunks.map(async (chunk, i) => {
        const embedding = await createEmbedding(chunk);
        return {
          id: `${Date.now()}-${i}`,
          values: embedding,
          metadata: {
            text: chunk,
            source: source || "unknown",
            type: type || "text",
            timestamp: new Date().toISOString(),
          },
        };
      })
    );

    // Upload to Pinecone
    await index.upsert(vectors);

    return NextResponse.json({
      message: "Content processed and stored successfully",
      chunks: chunks.length,
    });
  } catch (error: any) {
    console.error("Error processing content:", error);
    return NextResponse.json(
      { error: error.message || "Error processing content" },
      { status: 500 }
    );
  }
}