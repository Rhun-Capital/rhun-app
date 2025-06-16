import { NextResponse } from 'next/server';
import { Connection, Transaction } from '@solana/web3.js';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { serializedTransaction } = await request.json();

    if (!serializedTransaction) {
      return NextResponse.json(
        { error: 'Missing transaction data' },
        { status: 400 }
      );
    }

    const rpcUrl = process.env.HELIUS_RPC_URL;
    const heliusApiKey = process.env.HELIUS_API_KEY;

    if (!rpcUrl || !heliusApiKey) {
      return NextResponse.json(
        { error: 'HELIUS_RPC_URL and HELIUS_API_KEY must be set in environment variables' },
        { status: 500 }
      );
    }

    // Create connection
    const connection = new Connection(`${rpcUrl}/?api-key=${heliusApiKey}`, 'confirmed');

    // Send transaction
    const signature = await connection.sendRawTransaction(
      Buffer.from(serializedTransaction, 'base64')
    );

    // Wait for confirmation
    await connection.confirmTransaction(signature);

    return NextResponse.json({ signature });
  } catch (error) {
    console.error('Error sending transaction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 