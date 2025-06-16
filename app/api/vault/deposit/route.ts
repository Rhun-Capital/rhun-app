import { NextResponse } from 'next/server';
import { PublicKey, Connection, Transaction } from '@solana/web3.js';
import VaultImpl from '@meteora-ag/vault-sdk';
import BN from 'bn.js';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tokenAddress, amount, walletAddress } = body;

    if (!tokenAddress || !amount || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Validate addresses
    try {
      new PublicKey(tokenAddress);
      new PublicKey(walletAddress);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid address format' },
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

    // Create vault instance
    const vault = await VaultImpl.create(connection, new PublicKey(tokenAddress));
    
    if (!vault) {
      return NextResponse.json(
        { error: 'Failed to create vault instance' },
        { status: 500 }
      );
    }

    // Build deposit transaction
    const transaction = await vault.deposit(
      new PublicKey(walletAddress),
      new BN(amount)
    );

    // Serialize transaction data
    const serializedInstructions = transaction.instructions.map(ix => ({
      programId: ix.programId.toBase58(),
      keys: ix.keys.map(k => ({
        pubkey: k.pubkey.toBase58(),
        isSigner: k.isSigner,
        isWritable: k.isWritable
      })),
      data: ix.data.toString('base64')
    }));

    return NextResponse.json({
      instructions: serializedInstructions,
      recentBlockhash: transaction.recentBlockhash,
      feePayer: transaction.feePayer?.toBase58(),
      vaultAddress: vault.vaultPda.toBase58(),
    });
  } catch (error) {
    console.error('Error creating deposit transaction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 