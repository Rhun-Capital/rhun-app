import { NextResponse } from 'next/server';
import { getTokenInfoForHolder } from '@/utils/aws-config';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Parse request body to get the list of addresses
    const body = await request.json();
    const { addresses } = body;
    
    if (!addresses || !Array.isArray(addresses)) {
      return NextResponse.json(
        { error: 'Array of addresses is required' },
        { status: 400 }
      );
    }

    // Get token info for each address
    const tokenInfoPromises = addresses.map(async (address: string) => {
      const tokenInfo = await getTokenInfoForHolder(address);
      
      if (!tokenInfo) {
        return { address, found: false };
      }
      
      // Try to get token metadata including icon
      let logoURI = null;
      try {
        const metadataResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/solana/token/${tokenInfo.token_address}/metadata`);
        if (metadataResponse.ok) {
          const metadataData = await metadataResponse.json();
          logoURI = metadataData.logoURI;
        }
      } catch (metadataError) {
        console.error(`Error fetching token metadata for ${tokenInfo.token_address}:`, metadataError);
      }
      
      return {
        address,
        found: true,
        token_address: tokenInfo.token_address,
        token_symbol: tokenInfo.token_symbol,
        token_name: tokenInfo.token_name,
        logoURI: logoURI
      };
    });
    
    const results = await Promise.all(tokenInfoPromises);
    
    // Create a map for easier consumption by frontend
    const tokenMap: Record<string, any> = {};
    results.forEach(result => {
      if (result.found) {
        tokenMap[result.address] = {
          address: result.token_address,
          symbol: result.token_symbol,
          name: result.token_name,
          logoURI: result.logoURI
        };
      }
    });
    
    return NextResponse.json({ tokens: tokenMap });
  } catch (error: any) {
    console.error('Error fetching batch token info:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch token info' },
      { status: 500 }
    );
  }
} 