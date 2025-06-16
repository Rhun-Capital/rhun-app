import { NextRequest, NextResponse } from 'next/server';
import { Connection, Transaction } from '@solana/web3.js';
import { getSolanaConnection } from '@/utils/solana';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serializedTransactions } = body;

    if (!serializedTransactions || !Array.isArray(serializedTransactions)) {
      return NextResponse.json({ error: 'Serialized transactions are required' }, { status: 400 });
    }

    console.log(`Executing ${serializedTransactions.length} withdraw and close transactions`);

    // Use server-side connection with Helius RPC
    const connection = getSolanaConnection();
    
    let signatures: string[] = [];

    // Process each transaction sequentially
    for (let i = 0; i < serializedTransactions.length; i++) {
      const serializedTx = serializedTransactions[i];
      
      try {
        console.log(`Processing transaction ${i + 1}/${serializedTransactions.length}`);
        
        // Convert array back to Buffer
        const transactionBuffer = Buffer.from(serializedTx);
        
        // Send the transaction
        const signature = await connection.sendRawTransaction(transactionBuffer, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3
        });

        console.log(`Transaction ${i + 1} sent with signature: ${signature}`);

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');

        if (confirmation.value.err) {
          throw new Error(`Transaction ${i + 1} failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        console.log(`Transaction ${i + 1} confirmed successfully`);
        signatures.push(signature);

      } catch (txError) {
        console.error(`Error processing transaction ${i + 1}:`, txError);
        throw new Error(`Transaction ${i + 1} failed: ${txError instanceof Error ? txError.message : String(txError)}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'All withdraw and close transactions executed successfully',
      signatures,
      transactionCount: signatures.length,
      explorerUrls: signatures.map(sig => `https://solscan.io/tx/${sig}`)
    });

  } catch (error) {
    console.error('Error executing withdraw and close transactions:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to execute withdraw and close transactions',
        success: false 
      },
      { status: 500 }
    );
  }
} 