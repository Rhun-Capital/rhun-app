import { NextResponse, NextRequest } from 'next/server';
import { initPinecone, createEmbedding, chunkText } from '@/utils/embeddings';
import { PDFDocument } from 'pdf-lib';
import mammoth from 'mammoth';
import { writeFile } from 'fs/promises';
import { join } from 'path';

async function extractPDFText(buffer: Buffer): Promise<string> {
  try {
    // Alternative libraries for text extraction
    const pdfjs = await import('pdfjs-dist');
    
    // Configure PDF.js
    const loadingTask = pdfjs.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine text items
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
    }

    return fullText.trim();
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


    // Save file temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempPath = join('/tmp', file.name);
    await writeFile(tempPath, new Uint8Array(buffer));

    // Extract text based on file type
    let text = '';
    if (file.name.endsWith('.pdf')) {
      text = await extractPDFText(buffer);
    } else if (file.name.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ path: tempPath });
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