import { NextResponse } from 'next/server';
import { getPortfolioValue } from '@/utils/agent-tools';

export async function GET(
  request: Request,
  { params }: { params: { walletAddress: string } }
) {
  try {
    const data = await getPortfolioValue(params.walletAddress);
    return NextResponse.json(data);
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: 'Failed to fetch portfolio data' }, { status: 500 });
  }
}