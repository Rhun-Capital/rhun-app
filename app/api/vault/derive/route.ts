import { NextResponse } from 'next/server';
import { PublicKey, Connection } from '@solana/web3.js';
import VaultImpl from '@meteora-ag/vault-sdk';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenA = searchParams.get('tokenA');
    const tokenB = searchParams.get('tokenB');

    if (!tokenA || !tokenB) {
      return NextResponse.json({ error: 'Missing token addresses' }, { status: 400 });
    }

    // Validate token addresses
    try {
      new PublicKey(tokenA);
      new PublicKey(tokenB);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token address format' }, { status: 400 });
    }

    const rpcUrl = process.env.HELIUS_RPC_URL;
    const heliusApiKey = process.env.HELIUS_API_KEY;

    if (!rpcUrl || !heliusApiKey) {
      return NextResponse.json(
        { error: 'HELIUS_RPC_URL and HELIUS_API_KEY must be set in environment variables' },
        { status: 500 }
      );
    }

    // Create connection instance using direct Helius RPC
    const connection = new Connection(`${rpcUrl}/?api-key=${heliusApiKey}`, 'confirmed');

    // Create vault instance
    const vault = await VaultImpl.create(connection, new PublicKey(tokenA));
    
    if (!vault || !vault.vaultPda) {
      return NextResponse.json({ error: 'Failed to create vault instance' }, { status: 500 });
    }

    return NextResponse.json({ address: vault.vaultPda.toBase58() });
  } catch (error) {
    console.error('Error deriving vault address:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 