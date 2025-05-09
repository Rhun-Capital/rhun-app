import { NextResponse } from 'next/server';
import { getPrivyToken } from '@/utils/privy';

export const dynamic = 'force-dynamic';

// In-memory cache for token metadata
let tokenMetadataCache: { [address: string]: any } = {};
let lastCacheCleanup = 0;
const CACHE_TTL = 3600000; // 1 hour
const DEXSCREENER_API_URL = 'https://api.dexscreener.com/latest/dex';

// Token metadata interface
interface TokenMetadata {
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string | null;
}

// Common token icons for manual fallback
const KNOWN_TOKEN_ICONS: Record<string, string> = {
  'SOL': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
  'USDC': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  'USDT': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png',
  'BONK': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png',
  'JUP': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN/logo.png',
  'PYTH': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3/logo.png',
};

// Try to find an icon for a token from multiple sources
async function findTokenIcon(address: string, symbol: string): Promise<string | null> {
  // 1. Check if it's a known token with a predefined icon
  if (symbol && KNOWN_TOKEN_ICONS[symbol.toUpperCase()]) {
    return KNOWN_TOKEN_ICONS[symbol.toUpperCase()];
  }
  
  // 2. Try Jupiter API for token metadata (they often have icons)
  try {
    const jupiterResponse = await fetch(`https://token.jup.ag/strict/${address}`);
    if (jupiterResponse.ok) {
      const tokenData = await jupiterResponse.json();
      if (tokenData && tokenData.logoURI) {
        return tokenData.logoURI;
      }
    }
  } catch (error) {
    console.error('Error fetching token icon from Jupiter:', error);
  }
  
  // 3. Try Solana token list as a fallback
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${address}/logo.png`,
      { method: 'HEAD' }
    );
    if (response.ok) {
      return `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${address}/logo.png`;
    }
  } catch (error) {
    // Ignore error, continue to next source
  }
  
  // No icon found
  return null;
}

async function getTokenMetadataFromDexScreener(address: string) {
  // Clean the cache occasionally
  const now = Date.now();
  if (now - lastCacheCleanup > CACHE_TTL) {
    tokenMetadataCache = {};
    lastCacheCleanup = now;
  }
  
  // Return cached data if available
  if (tokenMetadataCache[address]) {
    return tokenMetadataCache[address];
  }
  
  try {
    console.log(`Fetching token metadata from DexScreener for ${address}`);
    
    // Try first with the tokens endpoint
    let response = await fetch(`${DEXSCREENER_API_URL}/tokens/${address}`);
    
    // If that fails, try with the solana-specific endpoint
    if (!response.ok) {
      console.log(`Trying alternative DexScreener endpoint for Solana token: ${address}`);
      response = await fetch(`${DEXSCREENER_API_URL}/tokens/solana/${address}`);
    }
    
    if (!response.ok) {
      // If both fail, try one more approach with pairs endpoint
      console.log(`Trying token-pairs endpoint for token: ${address}`);
      response = await fetch(`https://api.dexscreener.com/token-pairs/v1/solana/${address}`);
      
      if (!response.ok) {
        throw new Error(`All DexScreener API endpoints failed: ${response.status}`);
      }
    }
    
    const data = await response.json();
    
    // Different endpoints have different response structures
    let pairs = data.pairs;
    if (!pairs && Array.isArray(data)) {
      // Handle token-pairs endpoint response format
      pairs = data;
    }
    
    if (!pairs || pairs.length === 0) {
      console.log(`No token pairs found for ${address}`);
      return null;
    }
    
    // Get the token data from the first pair
    const pair = pairs[0];
    
    // DexScreener may include this token as either the base or quote token
    // Check which one it is by comparing addresses (case-insensitive)
    let tokenData;
    const normalizedAddress = address.toLowerCase();
    
    if (pair.baseToken.address.toLowerCase() === normalizedAddress) {
      tokenData = pair.baseToken;
    } else if (pair.quoteToken.address.toLowerCase() === normalizedAddress) {
      tokenData = pair.quoteToken;
    } else {
      // If we can't find the token in the first pair, try other pairs
      const matchingPair = pairs.find((p: {
        baseToken: { address: string };
        quoteToken: { address: string };
      }) => 
        p.baseToken.address.toLowerCase() === normalizedAddress || 
        p.quoteToken.address.toLowerCase() === normalizedAddress
      );
      
      if (matchingPair) {
        tokenData = matchingPair.baseToken.address.toLowerCase() === normalizedAddress 
          ? matchingPair.baseToken 
          : matchingPair.quoteToken;
      } else {
        console.log(`Token address ${address} not found in any pairs`);
        return null;
      }
    }
    
    // Prepare the metadata in our format
    const metadata: TokenMetadata = {
      symbol: tokenData.symbol || '',
      name: tokenData.name || '',
      decimals: parseInt(tokenData.decimals) || 9,
      logoURI: null // DexScreener doesn't provide logos
    };
    
    // Try to find an icon for this token
    try {
      const iconUrl = await findTokenIcon(address, tokenData.symbol);
      if (iconUrl) {
        metadata.logoURI = iconUrl;
      }
    } catch (iconError) {
      console.error('Error finding token icon:', iconError);
    }
    
    console.log(`Found token metadata from DexScreener: ${JSON.stringify(metadata)}`);
    
    // Cache the result
    tokenMetadataCache[address] = metadata;
    return metadata;
  } catch (error) {
    console.error('Error fetching from DexScreener:', error);
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const token = await getPrivyToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.HELIUS_API_KEY) {
      throw new Error('HELIUS_API_KEY is required in environment variables');
    }

    // Basic validation for Solana address format
    if (!params.address || params.address.length !== 44 || !/^[1-9A-HJ-NP-Za-km-z]{44}$/.test(params.address)) {
      throw new Error(`Invalid token address format: ${params.address}`);
    }

    // Try Jupiter API first as it's most reliable for token metadata
    try {
      const jupiterResponse = await fetch(`https://token.jup.ag/strict/${params.address}`);
      if (jupiterResponse.ok) {
        const jupiterData = await jupiterResponse.json();
        if (jupiterData) {
          console.log('Found token metadata from Jupiter:', jupiterData);
          const metadata: TokenMetadata = {
            symbol: jupiterData.symbol || 'Unknown',
            name: jupiterData.name || 'Unknown Token',
            decimals: jupiterData.decimals || 9,
            logoURI: jupiterData.logoURI || null
          };
          return NextResponse.json(metadata);
        }
      }
    } catch (jupiterError) {
      console.error('Error fetching from Jupiter:', jupiterError);
    }

    const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
    
    // Try to fetch token metadata from Solscan API first
    try {
      const solscanResponse = await fetch(`https://api.solscan.io/token/meta?token=${params.address}`);
      if (solscanResponse.ok) {
        const solscanData = await solscanResponse.json();
        if (solscanData && solscanData.success) {
          const metadata: TokenMetadata = {
            symbol: solscanData.data.symbol || 'Unknown',
            name: solscanData.data.name || 'Unknown Token',
            decimals: solscanData.data.decimals || 0,
            logoURI: solscanData.data.icon || null
          };
          
          // If Solscan didn't provide an icon, try to find one
          if (!metadata.logoURI) {
            try {
              const iconUrl = await findTokenIcon(params.address, metadata.symbol);
              if (iconUrl) {
                metadata.logoURI = iconUrl;
              }
            } catch (iconError) {
              console.error('Error finding token icon:', iconError);
            }
          }
          
          console.log(`Using Solscan metadata: ${JSON.stringify(metadata)}`);
          return NextResponse.json(metadata);
        }
      }
    } catch (solscanError) {
      console.error('Error fetching from Solscan:', solscanError);
    }
    
    // Fallback to DexScreener API
    const dexScreenerData = await getTokenMetadataFromDexScreener(params.address);
    if (dexScreenerData) {
      return NextResponse.json(dexScreenerData);
    }
    
    // Fallback to on-chain data
    try {
      const metadataResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'helius-fetch-token-metadata',
          method: 'getAccountInfo',
          params: [params.address, { encoding: 'jsonParsed' }]
        }),
      });
      
      if (!metadataResponse.ok) {
        throw new Error('Failed to fetch token metadata');
      }
      
      const metadataData = await metadataResponse.json();
      const tokenData = metadataData.result?.value?.data?.parsed?.info;
      
      if (tokenData) {
        const metadata: TokenMetadata = {
          symbol: tokenData.symbol || 'Unknown',
          name: tokenData.name || 'Unknown Token',
          decimals: tokenData.decimals || 0,
          logoURI: null
        };
        
        // Try to find an icon for this token
        try {
          const iconUrl = await findTokenIcon(params.address, metadata.symbol);
          if (iconUrl) {
            metadata.logoURI = iconUrl;
          }
        } catch (iconError) {
          console.error('Error finding token icon:', iconError);
        }
        
        console.log(`Using on-chain token metadata: ${JSON.stringify(metadata)}`);
        return NextResponse.json(metadata);
      }
    } catch (onChainError) {
      console.error('Error fetching on-chain data:', onChainError);
    }
    
    // If all methods fail, return a generic response with shortened address 
    const shortAddr = params.address.substring(0, 4) + '..' + params.address.substring(params.address.length - 4);
    const fallbackMetadata: TokenMetadata = {
      symbol: shortAddr,
      name: `Token ${shortAddr}`,
      decimals: 9,
      logoURI: null
    };
    
    // Try one last time to find an icon
    try {
      const iconUrl = await findTokenIcon(params.address, shortAddr);
      if (iconUrl) {
        fallbackMetadata.logoURI = iconUrl;
      }
    } catch (iconError) {
      // Ignore errors in fallback case
    }
    
    console.log(`Using fallback token metadata: ${JSON.stringify(fallbackMetadata)}`);
    return NextResponse.json(fallbackMetadata);
    
  } catch (error: any) {
    console.error('Error fetching token metadata:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch token metadata' },
      { status: 500 }
    );
  }
} 