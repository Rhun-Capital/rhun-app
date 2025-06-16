import { NextResponse } from 'next/server';
import { PublicKey, Connection } from '@solana/web3.js';
import { getStablePool } from '@/utils/meteora-dynamic';
import BN from 'bn.js';

export const runtime = 'nodejs';

// Hardcoded RHUN-SOL pool address and tokenA (RHUN)
const RHUN_SOL_POOL = '2jxVjkPignEbR5pbGNtiRyCc6fAKZTKuFTf1MQED9pt5';
const RHUN_MINT = 'Gh8yeA9vH5Fun7J6esFH3mV65cQTBpxk9Z5XpzU7pump';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      walletAddress, 
      tokenXAmount, 
      tokenYAmount, 
      strategy = 'spot', 
      binRange = 10, 
      autoFill = true,
      signedTransaction // The transaction signed by the frontend
    } = body;

    // Validate required parameters
    if (!walletAddress || !tokenXAmount || !signedTransaction) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Validate wallet address
    try {
      new PublicKey(walletAddress);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 });
    }

    // Create connection to send the transaction
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );

    // Send the signed transaction
    const transactionBuffer = Buffer.from(signedTransaction);
    const signature = await connection.sendRawTransaction(transactionBuffer, {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    });

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    return NextResponse.json({
      success: true,
      message: 'DLMM position created and confirmed successfully',
      signature,
      confirmation: confirmation.value,
      explorerUrl: `https://solscan.io/tx/${signature}`
    });
  } catch (error) {
    console.error('Error executing DLMM position transaction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 