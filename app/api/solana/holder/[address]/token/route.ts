import { NextResponse } from 'next/server';
import { getTokenInfoForHolder } from '@/utils/aws-config';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    if (!params.address) {
      return NextResponse.json(
        { error: 'Holder address is required' },
        { status: 400 }
      );
    }

    const tokenInfo = await getTokenInfoForHolder(params.address);
    
    if (!tokenInfo) {
      return NextResponse.json(
        { found: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      found: true,
      token_address: tokenInfo.token_address,
      token_symbol: tokenInfo.token_symbol,
      token_name: tokenInfo.token_name
    });
  } catch (error: any) {
    console.error('Error fetching token info for holder:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch token info' },
      { status: 500 }
    );
  }
} 