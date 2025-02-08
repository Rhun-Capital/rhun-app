// app/api/solana/rpc/route.ts
import { NextRequest, NextResponse } from 'next/server';

const HELIUS_RPC = `${process.env.HELIUS_RPC_URL}/?api-key=${process.env.HELIUS_API_KEY}`;

export async function POST(request: NextRequest) {
    try {
      const body = await request.json();
      
      // Enhanced request logging
      console.log('Incoming RPC request:', {
        method: body.method,
        params: body.params,
        id: body.id,
        url: HELIUS_RPC.split('?')[0] // Log URL without API key
      });
  
      const rpcRequest = {
        jsonrpc: '2.0',
        id: body.id || 1,
        method: body.method,
        params: body.params || []
      };

      console.log('Forwarding to Helius:', rpcRequest);

      const response = await fetch(HELIUS_RPC, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rpcRequest)
      });
  
      if (!response.ok) {
        const error = await response.text();
        console.error('Helius error response:', {
          status: response.status,
          statusText: response.statusText,
          error
        });
        return NextResponse.json(
          { error: { message: `RPC request failed: ${response.status} ${response.statusText}`, details: error } },
          { status: response.status }
        );
      }
  
      const data = await response.json();
      
      // Log successful responses too
      console.log('Helius response:', {
        method: body.method,
        success: !data.error,
        error: data.error,
        resultType: data.result ? typeof data.result : null
      });
  
      return NextResponse.json(data);
    } catch (error: any) {
      console.error('RPC proxy error:', {
        error,
        message: error.message,
        stack: error.stack
      });
      return NextResponse.json(
        { 
          error: {
            message: error.message || 'Internal server error',
            details: error.stack
          }
        }, 
        { status: 500 }
      );
    }
}

export const runtime = 'edge';