// app/api/network-activity/route.ts
import { NextResponse } from 'next/server';
import { getTransactionCount, getTransactionVolume } from '@/utils/network-activity';

export async function GET(
  request: Request
) {
  try {
    const [volume, count] = await Promise.all([
      getTransactionVolume(),
      getTransactionCount()
    ]);

    return NextResponse.json({
      volume,
      count
    });
  } catch (error) {
    console.error('Error fetching network activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch network activity data' },
      { status: 500 }
    );
  }
}