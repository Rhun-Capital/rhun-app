import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { getSolanaConnection } from '@/utils/solana';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signedTransactions } = body;

    if (!signedTransactions || !Array.isArray(signedTransactions)) {
      return NextResponse.json({ error: 'Signed transactions array is required' }, { status: 400 });
    }

    console.log('Executing claim transactions:', signedTransactions.length);

    // Use server-side connection with Helius RPC
    const connection = getSolanaConnection();

    const signatures = [];
    const confirmations = [];

    // Send all transactions
    for (const signedTransaction of signedTransactions) {
      try {
        const transactionBuffer = Buffer.from(signedTransaction);
        const signature = await connection.sendRawTransaction(transactionBuffer, {
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        });

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');

        if (confirmation.value.err) {
          console.error(`Transaction ${signature} failed:`, confirmation.value.err);
          return NextResponse.json({
            error: `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
            signature
          }, { status: 400 });
        }

        signatures.push(signature);
        confirmations.push(confirmation.value);
      } catch (error) {
        console.error('Error executing claim transaction:', error);
        return NextResponse.json({
          error: error instanceof Error ? error.message : 'Failed to execute transaction',
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'All claim transactions executed successfully',
      signatures,
      confirmations,
      transactionCount: signatures.length,
      explorerUrls: signatures.map(sig => `https://solscan.io/tx/${sig}`)
    });

  } catch (error) {
    console.error('Error in execute claim endpoint:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 