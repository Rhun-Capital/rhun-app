import { NextResponse } from 'next/server';
import { MeteoraVault } from '@/utils/meteora';
import { PublicKey } from '@solana/web3.js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vaultAddress = searchParams.get('vaultAddress');
    const userAddress = searchParams.get('userAddress');
    const tokenAddress = searchParams.get('tokenAddress');

    if (!vaultAddress || !userAddress || !tokenAddress) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const vault = new MeteoraVault(new PublicKey(vaultAddress));
    await vault.initialize(tokenAddress);
    console.log('Received query params:', { vaultAddress, userAddress, tokenAddress });
    const position = await vault.getUserPosition(userAddress);
    let numericPosition = 0;
    if (position && typeof position === 'object' && 'toNumber' in position && typeof (position as any).toNumber === 'function') {
      numericPosition = (position as any).toNumber();
    } else {
      numericPosition = Number(position) || 0;
    }
    console.log('User position raw value:', position, 'Type:', typeof position, 'Numeric:', numericPosition);

    return NextResponse.json(numericPosition);
  } catch (error) {
    console.error('Error fetching user balance:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 