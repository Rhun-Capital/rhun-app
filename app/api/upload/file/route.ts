import { NextResponse, NextRequest } from 'next/server';
import { initPinecone, createEmbedding, chunkText } from '@/utils/embeddings';
import mammoth from 'mammoth';
import { writeFile } from 'fs/promises';
import { join } from 'path';

async function extractPDFText(buffer: Buffer): Promise<string> {
  try {
    const PDFParser = (await import('pdf2json')).default;
    const pdfParser = new PDFParser();

    return new Promise((resolve, reject) => {
      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        const text = decodeURIComponent(pdfData.Pages.map((page: any) => 
          page.Texts.map((text: any) => text.R[0].T).join(' ')
        ).join('\n'));
        resolve(text);
      });

      pdfParser.on("pdfParser_dataError", (errData: any) => {
        reject(new Error(errData.parserError));
      });

      pdfParser.parseBuffer(buffer);
    });
  } catch (error) {
    console.error('Text Extraction Error:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const agentId = formData.get('agentId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract text based on file type
    let text = '';
    if (file.name.endsWith('.pdf')) {
      text = await extractPDFText(buffer);
    } else if (file.name.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });  // Note: changed to use buffer directly
      text = result.value;
    } else if (file.name.endsWith('.txt')) {
      text = buffer.toString('utf8');
    } else {
      return NextResponse.json(
        { error: 'Unsupported file format' },
        { status: 400 }
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
            source: file.name,
            type: 'document',
            timestamp: new Date().toISOString(),
            agentId,
          },
        };
      })
    );

    // Upload to Pinecone
    await index.upsert(vectors);

    return NextResponse.json({
      message: 'File processed successfully',
      chunks: chunks.length,
    });

  } catch (error: any) {
    console.error('Error processing file:', error);
    return NextResponse.json(
      { error: error.message || 'Error processing file' },
      { status: 500 }
    );
  }
}