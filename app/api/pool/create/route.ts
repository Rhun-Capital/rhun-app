import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    return NextResponse.json(
      { error: 'Pool creation is not yet implemented with DLMM SDK. Please use existing pools.' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error in pool creation endpoint:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 