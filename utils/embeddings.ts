import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from 'openai';

// Initialize Pinecone client
const initPinecone = () => {
  return new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
};
// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Function to create embeddings
const createEmbedding = async (text: string) => {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });
  return response.data[0].embedding;
};

// Function to chunk text
const chunkText = (text: string, size: number = 500) => {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
};

export { initPinecone, openai, createEmbedding, chunkText };