import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { initPinecone, createEmbedding, chunkText } from '@/utils/embeddings';

export async function POST(req: Request) {
  try {
    const { url, metadata } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Fetch webpage content
    const response = await axios.get(url);
    const html = response.data;

    // Parse content with cheerio
    const $ = cheerio.load(html);
    
    // Remove unwanted elements
    $('script, style, noscript, iframe, img, header, footer, nav').remove();

    // Extract text from main content elements
    const textContent = $('body')
      .find('p, h1, h2, h3, h4, h5, h6, article, section')
      .map((_, el) => $(el).text().trim())
      .get()
      .join('\n')
      .replace(/\s+/g, ' ')
      .trim();

    // Initialize Pinecone
    const pinecone = await initPinecone();
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

    // Split text into chunks
    const chunks = chunkText(textContent);

    // Create embeddings for each chunk
    const vectors = await Promise.all(
      chunks.map(async (chunk, i) => {
        const embedding = await createEmbedding(chunk);
        return {
          id: `${Date.now()}-${i}`,
          values: embedding,
          metadata: {
            text: chunk,
            source: url,
            type: 'url',
            timestamp: new Date().toISOString(),
            ...metadata // Include additional metadata like agentId
          },
        };
      })
    );

    // Upload to Pinecone
    await index.upsert(vectors);

    return NextResponse.json({
      message: 'URL processed successfully',
      chunks: chunks.length,
    });
  } catch (error: any) {
    console.error('Error processing URL:', error);
    return NextResponse.json(
      { error: error.message || 'Error processing URL' },
      { status: 500 }
    );
  }
}