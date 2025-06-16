import { NextResponse } from 'next/server';
import { MeteoraVault } from '@/utils/meteora';
import { PublicKey } from '@solana/web3.js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, vaultAddress, userAddress, amount, wallet } = body;

    if (!action || !vaultAddress || !userAddress || amount === undefined || !wallet) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const vault = new MeteoraVault(vaultAddress);
    let signature;

    if (action === 'deposit') {
      signature = await vault.deposit(wallet, amount);
    } else if (action === 'withdraw') {
      signature = await vault.withdraw(wallet, amount);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ signature });
  } catch (error) {
    console.error('Error processing vault action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 