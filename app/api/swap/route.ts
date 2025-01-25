// app/api/jupiter-swap/route.ts
import { NextResponse } from 'next/server';

const JUPITER_API_URL = process.env.NEXT_PUBLIC_JUPITER_API_URL;

export async function GET(request: Request) {
 try {
   const { searchParams } = new URL(request.url);
   const inputMint = searchParams.get('inputMint');
   const outputMint = searchParams.get('outputMint'); 
   const amount = searchParams.get('amount');

   if (!inputMint || !outputMint || !amount) {
     return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
   }

   const quoteResponse = await fetch(
     `${JUPITER_API_URL}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}`
   );

   const quote = await quoteResponse.json();
   return NextResponse.json(quote);
 } catch (error) {
   return NextResponse.json({ error: 'Failed to get quote' }, { status: 500 });
 }
}

export async function POST(request: Request) {
 try {
   const { signedTransaction } = await request.json();
   const response = await fetch(`${JUPITER_API_URL}/swap`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ signedTransaction })
   });
   return NextResponse.json(await response.json());
 } catch (error) {
   return NextResponse.json({ error: 'Swap failed' }, { status: 500 });
 }
}