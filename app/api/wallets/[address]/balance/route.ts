import { NextResponse } from 'next/server';
import { getSolanaBalance } from '@/utils/solana';

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params;
    const heliusApiKey = process.env.HELIUS_API_KEY;
    if (!heliusApiKey) {
      throw new Error('HELIUS_API_KEY is not defined');
    }
    const balance = await getSolanaBalance(address, heliusApiKey);
    const data = { balance };
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching balance:', error);
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}