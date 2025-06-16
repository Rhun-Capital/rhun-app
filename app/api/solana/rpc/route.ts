// app/api/solana/rpc/route.ts
import { NextRequest, NextResponse } from 'next/server';

const HELIUS_RPC = `${process.env.HELIUS_RPC_URL}/?api-key=${process.env.HELIUS_API_KEY}`;

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { method, params } = body;

    console.log('RPC Proxy Request:', { method, params });

    const rpcUrl = process.env.HELIUS_RPC_URL;
    const heliusApiKey = process.env.HELIUS_API_KEY;

    if (!rpcUrl || !heliusApiKey) {
      return NextResponse.json(
        { error: 'HELIUS_RPC_URL and HELIUS_API_KEY must be set in environment variables' },
        { status: 500 }
      );
    }

    const response = await fetch(`${rpcUrl}/?api-key=${heliusApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });

    const responseData = await response.json();
    console.log('RPC Proxy Response:', { method, status: response.status, data: responseData });

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: responseData.error?.message || 'RPC request failed',
          details: responseData
        },
        { status: response.status }
      );
    }

    if (responseData.error) {
      return NextResponse.json(
        { 
          error: responseData.error.message || 'RPC error',
          details: responseData.error
        },
        { status: 400 }
      );
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('RPC proxy error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}