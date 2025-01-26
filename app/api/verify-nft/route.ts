// app/api/verify-nft/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();
    
    const response = await fetch(`https://api.crossmint.com/api/v1-alpha1/orders/${orderId}`, {
      headers: {
        'x-api-key': process.env.CROSSMINT_API_KEY as string
      }
    });
    const orderData = await response.json();
    const walletAddress = orderData.buyer?.walletAddress;

    if (!walletAddress) {
      return NextResponse.json({ message: 'No wallet found' }, { status: 401 });
    }

    const nftResponse = await fetch(
      `https://api.crossmint.com/api/v1-alpha1/wallets/${walletAddress}/nfts?collectionId=${process.env.NEXT_PUBLIC_COLLECTION_ID}`, 
      {
        headers: {
          'x-api-key': process.env.CROSSMINT_API_KEY as string
        }
      }
    );
    const nftData = await nftResponse.json();

    if (nftData.nfts?.length > 0) {
      cookies().set('crossmint_order_id', orderId, {
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      return NextResponse.json({ message: 'NFT ownership verified' });
    }

    return NextResponse.json({ message: 'No NFT found' }, { status: 401 });
  } catch (error) {
    console.error('NFT verification error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}