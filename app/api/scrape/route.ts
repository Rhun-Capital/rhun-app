import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { initPinecone, createEmbedding, chunkText } from '@/utils/embeddings';
import pLimit from 'p-limit';

const BATCH_SIZE = 100;
const CHUNK_SIZE = 8000;
const MAX_CHUNKS = 1000;

async function fetchWithRetry(url: string, maxRetries = 3) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0'
  };

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(url, {
        headers,
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: status => status < 500
      });

      if (response.status === 403) {
        throw new Error('Access denied by the website');
      }

      return response.data;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 2000 * (i + 1))); // Exponential backoff
    }
  }
}

export async function POST(req: Request) {
  try {
    const { url, metadata } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Initialize Pinecone first
    const pinecone = await initPinecone();
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

    // Fetch webpage with retry logic
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);
    
    // Remove unwanted elements
    $('script, style, noscript, iframe, img, header, footer, nav').remove();

    const textContent = $('body')
      .find('p, h1, h2, h3, h4, h5, h6, article, section')
      .map((_, el) => $(el).text().trim())
      .get()
      .join('\n')
      .replace(/\s+/g, ' ')
      .trim();

    if (!textContent) {
      return NextResponse.json({ error: 'No content found' }, { status: 400 });
    }

    const chunks = chunkText(textContent, CHUNK_SIZE).slice(0, MAX_CHUNKS);
    
    // Create embeddings with rate limiting
    const limit = pLimit(5);
    const vectors = await Promise.all(
      chunks.map((chunk, i) =>
        limit(async () => {
          const embedding = await createEmbedding(chunk);
          return {
            id: `${Date.now()}-${i}`,
            values: embedding,
            metadata: {
              text: chunk,
              source: url,
              type: 'url',
              timestamp: new Date().toISOString(),
              ...metadata
            },
          };
        })
      )
    );

    // Process in batches
    for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
      const batch = vectors.slice(i, i + BATCH_SIZE);
      await index.upsert(batch);
    }

    return NextResponse.json({
      message: 'URL processed successfully',
      chunks: chunks.length,
    });

  } catch (error: any) {
    console.error('Error details:', error);
    
    if (error.message === 'Access denied by the website') {
      return NextResponse.json({ 
        error: 'Website blocked access. Try again later or use a different approach.',
      }, { status: 403 });
    }

    return NextResponse.json({ 
      error: error.message || 'Failed to process URL'
    }, { status: 500 });
  }
}