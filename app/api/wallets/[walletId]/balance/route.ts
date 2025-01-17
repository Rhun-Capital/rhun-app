// app/api/wallets/[walletId]/balance/route.ts
import { NextResponse } from 'next/server';
import { getSolanaBalance } from '@/utils/solana';

export async function GET(
  request: Request,
  { params }: { params: { walletId: string } }
) {
  try {
    const { walletId } = params;
    const heliusApiKey = process.env.HELIUS_API_KEY;
    if (!heliusApiKey) {
      throw new Error('HELIUS_API_KEY is not defined');
    }
    const balance = await getSolanaBalance(walletId, heliusApiKey);
    const data = { balance };
    console.log('Balance:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching balance:', error);
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}