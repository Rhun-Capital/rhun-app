import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { storeTokenHolderActivity, ensureTokenHoldersActivityTableExists, TOKEN_HOLDERS_MAPPING_TABLE_NAME } from '@/utils/aws-config';
import { fetchTokenMetadata } from '@/utils/solscan-api';
import { fetchCoinGeckoTokenMetadata, fetchTokenPrices, calculateTokenValue } from '@/utils/coingecko';

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

// Add interfaces at the top of the file after imports
interface CoinGeckoTokenMetadata {
  symbol: string;
  name: string;
  detail_platforms?: {
    solana?: {
      decimal_place: number;
    };
  };
  image?: {
    small: string;
  };
  market_data?: {
    current_price?: {
      usd: number;
    };
    market_cap?: {
      usd: number;
    };
    total_liquidity?: {
      usd: number;
    };
  };
}

interface TokenMetadata {
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string | null;
  price: number;
  liquidity: number;
  marketCap?: number;
}

interface TokenInfo {
  address?: string;
  amount?: number;
  symbol?: string;
  decimals?: number;
  metadata?: {
    symbol?: string;
    name?: string;
    decimals?: number;
    price?: number;
    liquidity?: number;
    logoURI?: string;
  };
}

interface SwapInfo {
  fromToken?: TokenInfo;
  toToken?: TokenInfo;
  action?: string;
}

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
  const fromAddress = tokenInfo.fromToken?.address || 'SOL';
  console.log(`Address: ${fromAddress}`);
  if (fromAddress !== 'SOL') {
    console.log(`Explorer: ${getSolanaExplorerLink(fromAddress, 'token')}`);
  }
  console.log(`Amount: ${tokenInfo.fromToken?.amount}`);
  console.log(`Symbol: ${tokenInfo.fromToken?.metadata?.symbol || tokenInfo.fromToken?.symbol || 'Unknown'}`);
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
  const toAddress = tokenInfo.toToken?.address || 'SOL';
  console.log(`Address: ${toAddress}`);
  if (toAddress !== 'SOL') {
    console.log(`Explorer: ${getSolanaExplorerLink(toAddress, 'token')}`);
  }
  console.log(`Amount: ${tokenInfo.toToken?.amount}`);
  console.log(`Symbol: ${tokenInfo.toToken?.metadata?.symbol || tokenInfo.toToken?.symbol || 'Unknown'}`);
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
function extractTokenInfo(description: string, event: any): SwapInfo {
  const tokenInfo: SwapInfo = {
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
      // Helper function to determine if a mint is SOL
      const isSOL = (mint: string) => mint === 'So11111111111111111111111111111111111111112';
      
      // Get token symbols and metadata from the transfer data
      const outgoingSymbol = largestOutgoing.symbol || (isSOL(largestOutgoing.mint) ? 'SOL' : 'Unknown');
      const incomingSymbol = largestIncoming.symbol || (isSOL(largestIncoming.mint) ? 'SOL' : 'Unknown');
      
      // For SOL, we should use 'SOL' as both address and symbol
      const outgoingAddress = isSOL(largestOutgoing.mint) ? 'SOL' : largestOutgoing.mint;
      const incomingAddress = isSOL(largestIncoming.mint) ? 'SOL' : largestIncoming.mint;

      // Get token metadata from the event if available
      const outgoingMetadata = event.tokenMetadata?.[largestOutgoing.mint] || {};
      const incomingMetadata = event.tokenMetadata?.[largestIncoming.mint] || {};
      
      return {
        action: 'swap',
        fromToken: {
          address: outgoingAddress,
          amount: largestOutgoing.tokenAmount,
          symbol: outgoingMetadata.symbol || outgoingSymbol,
          decimals: largestOutgoing.decimals || outgoingMetadata.decimals || 9,
          metadata: outgoingMetadata
        },
        toToken: {
          address: incomingAddress,
          symbol: incomingMetadata.symbol || incomingSymbol,
          amount: largestIncoming.tokenAmount,
          decimals: largestIncoming.decimals || incomingMetadata.decimals || 9,
          metadata: incomingMetadata
        }
      };
    }
  }
  
  return null;
}

/**
 * Get token metadata and cache it
 */
async function getTokenMetadata(tokenAddress: string, symbol?: string): Promise<TokenMetadata | null> {
  if (!tokenAddress) return null;
  
  // If it's SOL, handle it specially
  if (tokenAddress === 'So11111111111111111111111111111111111111112' || symbol === 'SOL') {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await response.json();
      const solPrice = data.solana?.usd || 0;
      return {
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        price: solPrice,
        liquidity: 1000000000 // High liquidity for SOL
      };
    } catch (err) {
      console.error('Error fetching SOL price from CoinGecko:', err);
      return {
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        price: 0,
        liquidity: 0
      };
    }
  }
  
  // Check cache first
  if (tokenMetadataCache[tokenAddress]) {
    return tokenMetadataCache[tokenAddress] as TokenMetadata;
  }
  
  try {
    // Try CoinGecko first
    const coingeckoData = await fetchCoinGeckoTokenMetadata(tokenAddress) as CoinGeckoTokenMetadata;
    if (coingeckoData) {
      const metadata: TokenMetadata = {
        symbol: coingeckoData.symbol,
        name: coingeckoData.name,
        decimals: coingeckoData.detail_platforms?.solana?.decimal_place || 9,
        logoURI: coingeckoData.image?.small || null,
        price: coingeckoData.market_data?.current_price?.usd || 0,
        liquidity: coingeckoData.market_data?.total_liquidity?.usd || 0,
        marketCap: coingeckoData.market_data?.market_cap?.usd || 0
      };
      tokenMetadataCache[tokenAddress] = metadata;
      return metadata;
    }

    // Fallback to Solscan if CoinGecko fails
    const metadata = await fetchTokenMetadata(tokenAddress);
    if (metadata) {
      const enrichedMetadata: TokenMetadata = {
        ...metadata,
        liquidity: (metadata as any).liquidity || 0,
        price: (metadata as any).price || 0
      };
      tokenMetadataCache[tokenAddress] = enrichedMetadata;
      return enrichedMetadata;
    }
  } catch (error) {
    console.error(`Error fetching metadata for ${tokenAddress}:`, error);
  }
  
  return null;
}

// Add a helper to fetch Solscan transaction details
async function fetchSolscanTransactionDetail(signature: string) {
  const apiKey = process.env.SOLSCAN_API_KEY; // Set your API key in env
  if (!apiKey) {
    console.error('SOLSCAN_API_KEY is not set in environment variables');
    return null;
  }

  const url = `https://pro-api.solscan.io/v2.0/transaction/detail?tx=${signature}`;
  console.log('Fetching Solscan transaction details for:', signature);
  
  try {
    const res = await fetch(url, {
      headers: { 'token': apiKey }
    });
    
    if (!res.ok) {
      console.error('Solscan API error:', {
        status: res.status,
        statusText: res.statusText,
        signature
      });
      return null;
    }

    const data = await res.json();
    console.log('Solscan API response:', {
      signature,
      hasData: !!data.data,
      hasInstructions: !!data.data?.parsed_instructions,
      hasTokenChanges: !!data.data?.token_bal_change,
      tokenCount: data.data?.token_bal_change?.length || 0
    });

    return data.data; // The transaction detail object
  } catch (error) {
    console.error('Error fetching from Solscan:', error);
    return null;
  }
}

// Helper to extract swap tokens from parsed_instructions
function extractSwapFromInstructions(parsedInstructions: any[], tokenMeta: any) {
  if (!Array.isArray(parsedInstructions)) {
    console.log('No parsed instructions array found');
    return null;
  }

  console.log('Processing parsed instructions:', {
    instructionCount: parsedInstructions.length,
    hasTokenMeta: !!tokenMeta,
    tokenMetaKeys: Object.keys(tokenMeta || {})
  });

  for (const instr of parsedInstructions) {
    console.log('Checking instruction:', {
      type: instr.parsed_type,
      hasData: !!instr.data,
      hasToken1: !!instr.data?.token_1,
      hasToken2: !!instr.data?.token_2
    });

    if (
      instr.parsed_type?.toLowerCase().includes('swap') &&
      instr.data &&
      instr.data.token_1 &&
      instr.data.token_2
    ) {
      const swap = {
        fromToken: {
          address: instr.data.token_1,
          amount: Number(instr.data.amount_1) / Math.pow(10, instr.data.token_decimal_1),
          symbol: tokenMeta[instr.data.token_1]?.token_symbol || 'Unknown',
          metadata: {
            symbol: tokenMeta[instr.data.token_1]?.token_symbol || 'Unknown',
            name: tokenMeta[instr.data.token_1]?.token_name || 'Unknown Token',
            decimals: instr.data.token_decimal_1,
            logoURI: tokenMeta[instr.data.token_1]?.token_icon || null,
          },
        },
        toToken: {
          address: instr.data.token_2,
          amount: Number(instr.data.amount_2) / Math.pow(10, instr.data.token_decimal_2),
          symbol: tokenMeta[instr.data.token_2]?.token_symbol || 'Unknown',
          metadata: {
            symbol: tokenMeta[instr.data.token_2]?.token_symbol || 'Unknown',
            name: tokenMeta[instr.data.token_2]?.token_name || 'Unknown Token',
            decimals: instr.data.token_decimal_2,
            logoURI: tokenMeta[instr.data.token_2]?.token_icon || null,
          },
        },
      };

      console.log('Found swap:', {
        fromToken: {
          address: swap.fromToken.address,
          symbol: swap.fromToken.symbol,
          amount: swap.fromToken.amount
        },
        toToken: {
          address: swap.toToken.address,
          symbol: swap.toToken.symbol,
          amount: swap.toToken.amount
        }
      });

      return swap;
    }
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const webhookData = await request.json();
    
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
        // Initialize token variables in outer scope
        let fromToken: any = null;
        let toToken: any = null;
        let fromTokenMetadata: any = null;
        let toTokenMetadata: any = null;
        let solscanTx: any = null;
        let solscanMeta: any = {};

        // Fetch transaction details from Solscan
        try {
          const solscanResp = await fetchSolscanTransactionDetail(event.signature);
          solscanTx = solscanResp;
          solscanMeta = solscanResp?.metadata?.tokens || {};
          
          // Log token metadata
          console.log('Solscan token metadata:', {
            tokenCount: Object.keys(solscanMeta).length,
            tokens: Object.entries(solscanMeta).map(([address, meta]: [string, any]) => ({
              address,
              symbol: meta.token_symbol,
              name: meta.token_name
            }))
          });

          // Process token balance changes to identify the swap
          if (solscanTx?.token_bal_change) {
            const changes = solscanTx.token_bal_change;
            
            // Find the largest negative change (token being sold)
            const outgoing = changes
              .filter((t: any) => Number(t.change_amount) < 0)
              .sort((a: any, b: any) => Math.abs(Number(b.change_amount)) - Math.abs(Number(a.change_amount)));

            // Find the largest positive change (token being bought)
            const incoming = changes
              .filter((t: any) => Number(t.change_amount) > 0)
              .sort((a: any, b: any) => Math.abs(Number(b.change_amount)) - Math.abs(Number(a.change_amount)));

            // Get the largest outgoing and incoming changes
            const from = outgoing[0];
            // Find the largest positive change for a different token
            const to = incoming.find((t: any) => t.token_address !== from?.token_address);

            if (from && to) {
              const fromMeta = solscanMeta[from.token_address] || {};
              const toMeta = solscanMeta[to.token_address] || {};

              // Handle SOL specially
              const isSOL = (address: string) => address === 'So11111111111111111111111111111111111111112';
              
              // Try to get additional metadata from Jupiter for non-SOL tokens
              interface TokenAdditionalMetadata {
                token_symbol?: string;
                token_name?: string;
                token_icon?: string;
              }
              
              let fromAdditionalMeta: TokenAdditionalMetadata = {};
              let toAdditionalMeta: TokenAdditionalMetadata = {};
              
              if (!isSOL(from.token_address)) {
                try {
                  const response = await fetch(`https://token.jup.ag/strict/${from.token_address}`);
                  if (response.ok) {
                    const data = await response.json();
                    fromAdditionalMeta = {
                      token_symbol: data.symbol,
                      token_name: data.name,
                      token_icon: data.logoURI
                    };
                  }
                } catch (error) {
                  console.error(`Error fetching metadata for ${from.token_address}:`, error);
                }
              }
              
              if (!isSOL(to.token_address)) {
                try {
                  const response = await fetch(`https://token.jup.ag/strict/${to.token_address}`);
                  if (response.ok) {
                    const data = await response.json();
                    toAdditionalMeta = {
                      token_symbol: data.symbol,
                      token_name: data.name,
                      token_icon: data.logoURI
                    };
                  }
                } catch (error) {
                  console.error(`Error fetching metadata for ${to.token_address}:`, error);
                }
              }
              
              fromToken = {
                address: from.token_address,
                amount: Math.abs(Number(from.change_amount)) / Math.pow(10, from.decimals),
                decimals: from.decimals,
                metadata: {
                  symbol: isSOL(from.token_address) ? 'SOL' : (fromMeta.token_symbol || fromAdditionalMeta.token_symbol || 'Unknown'),
                  name: isSOL(from.token_address) ? 'Solana' : (fromMeta.token_name || fromAdditionalMeta.token_name || 'Unknown Token'),
                  decimals: from.decimals,
                  logoURI: fromMeta.token_icon || fromAdditionalMeta.token_icon || null,
                },
                // Use metadata symbol for the main symbol property
                symbol: isSOL(from.token_address) ? 'SOL' : (fromMeta.token_symbol || fromAdditionalMeta.token_symbol || 'Unknown'),
              };

              toToken = {
                address: to.token_address,
                amount: Math.abs(Number(to.change_amount)) / Math.pow(10, to.decimals),
                decimals: to.decimals,
                metadata: {
                  symbol: isSOL(to.token_address) ? 'SOL' : (toMeta.token_symbol || toAdditionalMeta.token_symbol || 'Unknown'),
                  name: isSOL(to.token_address) ? 'Solana' : (toMeta.token_name || toAdditionalMeta.token_name || 'Unknown Token'),
                  decimals: to.decimals,
                  logoURI: toMeta.token_icon || toAdditionalMeta.token_icon || null,
                },
                // Use metadata symbol for the main symbol property
                symbol: isSOL(to.token_address) ? 'SOL' : (toMeta.token_symbol || toAdditionalMeta.token_symbol || 'Unknown'),
              };
            }
          }

          // Fallback to old logic if we couldn't determine the swap from balance changes
          if (!fromToken || !toToken) {
            let tokenInfo = extractTokenInfo(event.description || '', event);
            if (tokenInfo.action !== 'swap') {
              const transferInfo = extractTokenTransfers(event);
              if (transferInfo && transferInfo.action === 'swap') {
                tokenInfo = transferInfo;
              }
            }
            fromToken = tokenInfo.fromToken;
            toToken = tokenInfo.toToken;
          }
        } catch (err) {
          console.error('Error fetching Solscan transaction detail:', err);
          // Fallback to old logic if Solscan fails
          let tokenInfo = extractTokenInfo(event.description || '', event);
          if (tokenInfo.action !== 'swap') {
            const transferInfo = extractTokenTransfers(event);
            if (transferInfo && transferInfo.action === 'swap') {
              tokenInfo = transferInfo;
            }
          }
          fromToken = tokenInfo.fromToken;
          toToken = tokenInfo.toToken;
        }

        // Get metadata for both tokens (price, etc)
        if (fromToken?.address) {
          fromTokenMetadata = await getTokenMetadata(fromToken.address, fromToken.symbol);
        }
        if (toToken?.address) {
          toTokenMetadata = await getTokenMetadata(toToken.address, toToken.symbol);
        }

        // Calculate USD values for the swap
        const fromTokenValue = fromTokenMetadata?.price
          ? calculateSwapValue(
              fromToken?.amount || 0,
              fromTokenMetadata.price,
              fromTokenMetadata.decimals
            )
          : 0;
        const toTokenValue = toTokenMetadata?.price
          ? calculateSwapValue(
              toToken?.amount || 0,
              toTokenMetadata.price,
              toTokenMetadata.decimals
            )
          : 0;
        let swapValueUSD = Math.max(fromTokenValue, toTokenValue);

        // Log detailed transaction information
        logTransactionDetails(event, { fromToken, toToken }, fromTokenMetadata, toTokenMetadata, swapValueUSD);

        // Skip if the swap value is below the minimum threshold
        if (swapValueUSD < MIN_SWAP_VALUE_USD) {
          console.log(`Skipping swap with value $${swapValueUSD.toFixed(2)} (below minimum of $${MIN_SWAP_VALUE_USD})`);
          continue;
        }

        // Log token balance changes if available
        if (solscanTx?.token_bal_change) {
          console.log('Token balance changes:', solscanTx.token_bal_change.map((change: any) => ({
            token: change.token_address,
            symbol: solscanMeta[change.token_address]?.token_symbol || 'Unknown',
            change: change.change_amount,
            decimals: change.decimals
          })));
        }

        // Find potential recipient addresses (addresses that received the toToken)
        const potentialRecipients = solscanTx?.token_bal_change
          ?.filter((change: any) => 
            Number(change.change_amount) > 0 &&
            change.owner
          )
          .map((change: any) => change.owner) || [];


        // If we have potential recipients, check which ones are in our TOKEN_HOLDERS_MAPPING_TABLE
        let trackedHolder = null;
        if (potentialRecipients.length > 0) {
          for (const recipient of potentialRecipients) {
            try {
              const response = await docClient.send(
                new QueryCommand({
                  TableName: TOKEN_HOLDERS_MAPPING_TABLE_NAME,
                  KeyConditionExpression: 'holder_address = :address',
                  ExpressionAttributeValues: {
                    ':address': recipient
                  }
                })
              );
              
              if (response.Items && response.Items.length > 0) {
                trackedHolder = response.Items[0];
                break;
              }
            } catch (error) {
              console.error(`Error checking holder mapping for address ${recipient}:`, error);
            }
          }
        }

        console.log('trackedHolder', trackedHolder);


        // Create enriched event data
        const enrichedEvent = {
          signature: event.signature,
          timestamp: event.timestamp,
          type: 'SWAP',
          description: event.description || `Swapped ${fromToken?.amount} ${fromToken?.symbol} for ${toToken?.amount} ${toToken?.symbol}`,
          holder_address: trackedHolder || event.accountData?.[0]?.account || '',
          holder_mapping: {
            token_address: trackedHolder?.token_address,
            token_symbol: trackedHolder?.token_symbol,
            token_name: trackedHolder?.token_name,
            token_logo_uri: trackedHolder?.token_logo_uri,
            token_decimals: trackedHolder?.token_decimals
          },
          native_balance_change: event.accountData?.[0]?.nativeBalanceChange || 0,
          token_transfers: [], // Minimize stored data
          fromToken: {
            address: fromToken?.address || null,
            symbol: fromToken?.metadata?.symbol || 'Unknown',
            amount: fromToken?.amount || 0,
            metadata: fromTokenMetadata || fromToken?.metadata || {
              symbol: fromToken?.metadata?.symbol || 'Unknown',
              name: fromToken?.metadata?.name || 'Unknown Token',
              decimals: 9
            },
            usd_value: fromTokenValue
          },
          toToken: {
            address: toToken?.address || null,
            symbol: toToken?.metadata?.symbol || 'Unknown',
            amount: toToken?.amount || 0,
            metadata: toTokenMetadata || toToken?.metadata || {
              symbol: toToken?.metadata?.symbol || 'Unknown',
              name: toToken?.metadata?.name || 'Unknown Token',
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