import { NextResponse } from 'next/server';
import { MeteoraVault } from '@/utils/meteora';
import { PublicKey } from '@solana/web3.js';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const tokenAddress = searchParams.get('tokenAddress');

    if (!address || !tokenAddress) {
      return NextResponse.json(
        { error: 'Vault address and token address are required' },
        { status: 400 }
      );
    }

    // Validate addresses
    let vaultPubkey: PublicKey;
    try {
      vaultPubkey = new PublicKey(address);
      new PublicKey(tokenAddress);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    try {
      const vault = new MeteoraVault(vaultPubkey);
      await vault.initialize(tokenAddress);
      const vaultInfo = await vault.getVaultInfo();
      return NextResponse.json(vaultInfo);
    } catch (error) {
      console.error('Error initializing vault:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to initialize vault' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in vault info endpoint:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 