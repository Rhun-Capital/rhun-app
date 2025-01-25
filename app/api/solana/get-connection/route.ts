// app/api/connection/route.ts
import { Connection } from '@solana/web3.js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const connection = new Connection(`${process.env.HELIUS_RPC_URL}/?api-key=${process.env.HELIUS_API_KEY}`);
  const blockHash = await connection.getLatestBlockhash();
  return NextResponse.json(blockHash);
}

export async function POST(request: NextRequest) {
  const connection = new Connection(`${process.env.HELIUS_RPC_URL}/?api-key=${process.env.HELIUS_API_KEY}`);
  
  try {
    const { method, params } = await request.json();
    
    if (typeof method !== 'string' || !(method in connection)) {
      return NextResponse.json({ error: 'Invalid method' }, { status: 400 });
    }
    
    const result = await (connection as any)[method](...params);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}