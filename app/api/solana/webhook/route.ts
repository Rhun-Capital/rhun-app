import { NextResponse } from 'next/server';
import { storeTokenHolderActivity, ensureTokenHoldersActivityTableExists } from '@/utils/aws-config';
import { fetchTokenMetadata } from '@/utils/solscan-api';
import { fetchCoinGeckoTokenMetadata, fetchTokenPrices, calculateTokenValue } from '@/utils/coingecko';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Extend the timeout to 60 seconds

// In-memory store for recent webhook events (for debugging)
const recentWebhookEvents: any[] = [];
const MAX_STORED_EVENTS = 50;

// Cache for token metadata to avoid repeated API calls
const tokenMetadataCache: Record<string, any> = {};

// Minimum USD value for storing swaps
const MIN_SWAP_VALUE_USD = 100; // Only store swaps worth more than $100

// Minimum liquidity threshold for price data reliability
const MIN_LIQUIDITY_USD = 10000; // Only use price data if liquidity is at least $10,000

// Helper function to create Solana Explorer links
function getSolanaExplorerLink(signature: string, type: 'tx' | 'token' = 'tx'): string {
  return `https://solscan.io/${type}/${signature}`;
}

// Helper function to calculate token value for swaps
function calculateSwapValue(amount: number, price: number, decimals: number = 9): number {
  // For tokens with decimals, we need to divide by 10^decimals
  // But for tokens like USDT that are already in human-readable format, we don't
  const isHumanReadable = decimals === 0 || amount < 1000000; // Simple heuristic
  const adjustedAmount = isHumanReadable ? amount : amount / Math.pow(10, decimals);
  return adjustedAmount * price;
}

// Helper function to log transaction details
function logTransactionDetails(event: any, tokenInfo: any, fromTokenMetadata: any, toTokenMetadata: any, swapValueUSD: number) {
  console.log('\n=== Transaction Details ===');
  console.log(`Signature: ${event.signature}`);
  console.log(`Explorer: ${getSolanaExplorerLink(event.signature)}`);
  console.log(`Timestamp: ${new Date(event.timestamp * 1000).toISOString()}`);
  console.log(`Holder: ${event.accountData?.[0]?.account}`);
  
  console.log('\n=== From Token ===');
  console.log(`Address: ${tokenInfo.fromToken?.address || 'SOL'}`);
  if (tokenInfo.fromToken?.address) {
    console.log(`Explorer: ${getSolanaExplorerLink(tokenInfo.fromToken.address, 'token')}`);
  }
  console.log(`Amount: ${tokenInfo.fromToken?.amount}`);
  console.log(`Symbol: ${fromTokenMetadata?.symbol || 'Unknown'}`);
  console.log(`Price: $${fromTokenMetadata?.price || 'N/A'}`);
  console.log(`Liquidity: $${fromTokenMetadata?.liquidity || 'N/A'}`);
  if (fromTokenMetadata?.price) {
    const fromValue = calculateSwapValue(
      tokenInfo.fromToken?.amount || 0,
      fromTokenMetadata.price,
      fromTokenMetadata.decimals
    );
    console.log(`Calculated Value: $${fromValue.toFixed(2)}`);
  }
  
  console.log('\n=== To Token ===');
  console.log(`Address: ${tokenInfo.toToken?.address || 'SOL'}`);
  if (tokenInfo.toToken?.address) {
    console.log(`Explorer: ${getSolanaExplorerLink(tokenInfo.toToken.address, 'token')}`);
  }
  console.log(`Amount: ${tokenInfo.toToken?.amount}`);
  console.log(`Symbol: ${toTokenMetadata?.symbol || 'Unknown'}`);
  console.log(`Price: $${toTokenMetadata?.price || 'N/A'}`);
  console.log(`Liquidity: $${toTokenMetadata?.liquidity || 'N/A'}`);
  if (toTokenMetadata?.price) {
    const toValue = calculateSwapValue(
      tokenInfo.toToken?.amount || 0,
      toTokenMetadata.price,
      toTokenMetadata.decimals
    );
    console.log(`Calculated Value: $${toValue.toFixed(2)}`);
  }
  
  console.log('\n=== Swap Summary ===');
  console.log(`Total Value: $${swapValueUSD.toFixed(2)}`);
  console.log(`Meets Minimum: ${swapValueUSD >= MIN_SWAP_VALUE_USD ? 'Yes' : 'No'}`);
  console.log('===================\n');
}

/**
 * Extract token addresses and amounts from transaction description
 */
function extractTokenInfo(description: string) {
  const tokenInfo: {
    fromToken?: { address?: string; amount?: number; symbol?: string },
    toToken?: { address?: string; amount?: number; symbol?: string },
    action?: string
  } = {
    action: 'transaction'
  };

  if (!description) return tokenInfo;

  // Only process SWAP pattern: "X swapped 0.123 SOL for 456.789 TOKEN"
  const swapMatch = description.match(/swapped\s+([\d.]+)\s+([^\s]+)\s+for\s+([\d.]+)\s+([^\s]+)/i);
  if (swapMatch) {
    tokenInfo.action = 'swap';
    tokenInfo.fromToken = {
      amount: parseFloat(swapMatch[1]),
      symbol: swapMatch[2]
    };
    tokenInfo.toToken = {
      amount: parseFloat(swapMatch[3]),
      symbol: swapMatch[4]
    };

    // If the symbol is a token address, extract it
    if (tokenInfo.toToken.symbol && tokenInfo.toToken.symbol !== 'SOL') {
      const addressMatch = tokenInfo.toToken.symbol.match(/([A-Za-z0-9]{32,})/);
      if (addressMatch) {
        tokenInfo.toToken.address = addressMatch[1];
        tokenInfo.toToken.symbol = 'Unknown';
      }
    }
  }

  return tokenInfo;
}

/**
 * Extract token transfers from webhook data when description doesn't have swap info
 */
function extractTokenTransfers(event: any) {
  if (!event.tokenTransfers || event.tokenTransfers.length === 0) {
    return null;
  }
  
  const holderAddress = event.accountData?.[0]?.account;
  if (!holderAddress) return null;
  
  // Find transfers where the holder is sending or receiving tokens
  const outgoingTransfers = event.tokenTransfers.filter((transfer: any) => 
    transfer.fromUserAccount === holderAddress
  );
  
  const incomingTransfers = event.tokenTransfers.filter((transfer: any) => 
    transfer.toUserAccount === holderAddress
  );
  
  // If we have both outgoing and incoming transfers, it's likely a swap
  if (outgoingTransfers.length > 0 && incomingTransfers.length > 0) {
    // Find the largest outgoing transfer (by value)
    const largestOutgoing = outgoingTransfers.sort((a: any, b: any) => 
      b.tokenAmount - a.tokenAmount
    )[0];
    
    // Find the largest incoming transfer (by value)
    const largestIncoming = incomingTransfers.sort((a: any, b: any) => 
      b.tokenAmount - a.tokenAmount
    )[0];
    
    if (largestOutgoing && largestIncoming) {
      return {
        action: 'swap',
        fromToken: {
          address: largestOutgoing.mint,
          amount: largestOutgoing.tokenAmount,
          symbol: largestOutgoing.mint === 'So11111111111111111111111111111111111111112' ? 'SOL' : 'Unknown'
        },
        toToken: {
          address: largestIncoming.mint,
          amount: largestIncoming.tokenAmount,
          symbol: largestIncoming.mint === 'So11111111111111111111111111111111111111112' ? 'SOL' : 'Unknown'
        }
      };
    }
  }
  
  return null;
}

/**
 * Get token metadata and cache it
 */
async function getTokenMetadata(tokenAddress: string) {
  if (!tokenAddress) return null;
  if (tokenAddress === 'So11111111111111111111111111111111111111112') {
    // Fetch SOL price from CoinGecko
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await response.json();
      const solPrice = data.solana?.usd || 0;
      return {
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        price: solPrice
      };
    } catch (err) {
      console.error('Error fetching SOL price from CoinGecko:', err);
      return {
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        price: 0
      };
    }
  }
  
  if (tokenMetadataCache[tokenAddress]) {
    return tokenMetadataCache[tokenAddress];
  }
  
  try {
    // Try CoinGecko first
    const coingeckoData = await fetchCoinGeckoTokenMetadata(tokenAddress);
    if (coingeckoData) {
      const metadata = {
        symbol: coingeckoData.symbol,
        name: coingeckoData.name,
        decimals: 9, // Default to 9 for Solana tokens
        logoURI: coingeckoData.image?.small || null,
        price: coingeckoData.market_data?.current_price?.usd || 0,
        marketCap: coingeckoData.market_data?.market_cap?.usd || 0
      };
      tokenMetadataCache[tokenAddress] = metadata;
      return metadata;
    }

    // Fallback to Solscan if CoinGecko fails
    const metadata = await fetchTokenMetadata(tokenAddress);
    if (metadata) {
      tokenMetadataCache[tokenAddress] = metadata;
      return metadata;
    }
  } catch (error) {
    console.error(`Error fetching metadata for ${tokenAddress}:`, error);
  }
  
  return null;
}

export async function POST(request: Request) {
  try {
    const webhookData = await request.json();
    console.log('Received webhook data');
    
    if (!webhookData || (!Array.isArray(webhookData) && !webhookData.accountData)) {
      return NextResponse.json(
        { error: 'Invalid webhook data format' },
        { status: 400 }
      );
    }
    
    // Only process a single event or the first 5 events if it's an array
    const events = Array.isArray(webhookData) 
      ? webhookData.slice(0, 5) 
      : [webhookData];
    
    // Process events sequentially instead of in parallel to avoid too many API calls at once
    const processedEvents = [];
    for (const event of events) {
      // Only process SWAP type events
      if (event.type !== 'SWAP') {
        console.log(`Skipping non-SWAP event of type: ${event.type}`);
        continue;
      }
      
      try {
        // First try to extract info from description
        let tokenInfo = extractTokenInfo(event.description || '');
        
        // If description didn't have swap info, try to extract from token transfers
        if (tokenInfo.action !== 'swap') {
          const transferInfo = extractTokenTransfers(event);
          if (transferInfo && transferInfo.action === 'swap') {
            tokenInfo = transferInfo;
          }
        }
        
        // Skip if we couldn't extract swap info
        if (tokenInfo.action !== 'swap') {
          continue;
        }
        
        let fromTokenMetadata = null;
        let toTokenMetadata = null;
        
        // Get metadata for both tokens
        if (tokenInfo.fromToken?.address) {
          fromTokenMetadata = await getTokenMetadata(tokenInfo.fromToken.address);
        }
        
        if (tokenInfo.toToken?.address) {
          toTokenMetadata = await getTokenMetadata(tokenInfo.toToken.address);
        }
        
        // Calculate USD values for the swap
        const fromTokenValue = fromTokenMetadata?.price
          ? calculateSwapValue(
              tokenInfo.fromToken?.amount || 0,
              fromTokenMetadata.price,
              fromTokenMetadata.decimals
            )
          : 0;
          
        const toTokenValue = toTokenMetadata?.price
          ? calculateSwapValue(
              tokenInfo.toToken?.amount || 0,
              toTokenMetadata.price,
              toTokenMetadata.decimals
            )
          : 0;
          
        // Use the larger of the two values to determine if this is a significant swap
        const swapValueUSD = Math.max(fromTokenValue, toTokenValue);
        
        // Log detailed transaction information
        logTransactionDetails(event, tokenInfo, fromTokenMetadata, toTokenMetadata, swapValueUSD);
        
        // Skip if the swap value is below the minimum threshold
        if (swapValueUSD < MIN_SWAP_VALUE_USD) {
          console.log(`Skipping swap with value $${swapValueUSD.toFixed(2)} (below minimum of $${MIN_SWAP_VALUE_USD})`);
          continue;
        }
        
        // Log if we're using low liquidity price data
        if (fromTokenMetadata?.liquidity && fromTokenMetadata.liquidity < MIN_LIQUIDITY_USD) {
          console.log(`Warning: Low liquidity for ${fromTokenMetadata.symbol} ($${fromTokenMetadata.liquidity})`);
        }
        if (toTokenMetadata?.liquidity && toTokenMetadata.liquidity < MIN_LIQUIDITY_USD) {
          console.log(`Warning: Low liquidity for ${toTokenMetadata.symbol} ($${toTokenMetadata.liquidity})`);
        }
        
        // Create enriched event data
        const enrichedEvent = {
          signature: event.signature,
          timestamp: event.timestamp,
          type: 'SWAP',
          description: event.description || `Swapped ${tokenInfo.fromToken?.amount} ${tokenInfo.fromToken?.symbol} for ${tokenInfo.toToken?.amount} ${tokenInfo.toToken?.symbol}`,
          holder_address: event.accountData?.[0]?.account || '',
          native_balance_change: event.accountData?.[0]?.nativeBalanceChange || 0,
          token_transfers: [], // Minimize stored data
          fromToken: {
            symbol: fromTokenMetadata?.symbol || tokenInfo.fromToken?.symbol || 'Unknown',
            amount: tokenInfo.fromToken?.amount || 0,
            metadata: fromTokenMetadata || {
              symbol: tokenInfo.fromToken?.symbol || 'Unknown',
              name: tokenInfo.fromToken?.symbol || 'Unknown Token',
              decimals: 9
            },
            usd_value: fromTokenValue
          },
          toToken: {
            symbol: toTokenMetadata?.symbol || tokenInfo.toToken?.symbol || 'Unknown',
            amount: tokenInfo.toToken?.amount || 0,
            metadata: toTokenMetadata || {
              symbol: tokenInfo.toToken?.symbol || 'Unknown',
              name: tokenInfo.toToken?.symbol || 'Unknown Token',
              decimals: 9
            },
            usd_value: toTokenValue
          },
          swap_value_usd: swapValueUSD
        };
        
        // Store in DynamoDB
        try {
          await storeTokenHolderActivity(enrichedEvent);
          processedEvents.push(enrichedEvent);
          console.log(`Successfully stored swap event: ${event.signature}`);
        } catch (error) {
          console.error('Error storing swap event:', error);
        }
      } catch (eventError) {
        console.error('Error processing event:', eventError);
        // Continue with next event instead of failing the whole request
        continue;
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      processed: processedEvents.length
    });
    
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process webhook data' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Webhook endpoint is running. POST to this endpoint to process webhook events."
  });
} 