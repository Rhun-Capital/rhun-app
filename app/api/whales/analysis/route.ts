import { NextResponse } from 'next/server';
import { getTopHolders } from '@/utils/agent-tools';
import { Connection, PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';

interface WhaleAnalysis {
  address: string;
  entryPrice: number;
  currentPrice: number;
  profitLossPercent: number;
  totalValue: number;
  tokenAmount: number;
  lastTradeTimestamp: number;
}

interface SolscanActivity {
  block_time: number;
  activity_type: string;
  value: number;
  routers: {
    token1: string;
    token1_decimals: number;
    amount1: string;
    token2: string;
    token2_decimals: number;
    amount2: string;
    child_routers?: Array<{
      token1: string;
      token1_decimals: number;
      amount1: string;
      token2: string;
      token2_decimals: number;
      amount2: string;
    }>;
  };
}

interface SolscanResponse {
  success: boolean;
  data: SolscanActivity[];
  metadata: {
    tokens: {
      [key: string]: {
        token_address: string;
        token_name: string;
        token_symbol: string;
        token_icon: string;
      };
    };
  };
}

async function getHolderTradeHistory(address: string, tokenAddress: string): Promise<{ entryPrice: number; lastTradeTimestamp: number; isPartialHistory: boolean }> {
  try {
    // Get activities from Solscan API
    const baseUrl = 'https://pro-api.solscan.io';
    
    const requestOptions = {
      method: "get",
      headers: {
        "token": process.env.SOLSCAN_API_KEY || ''
      }
    };

    const url = `${baseUrl}/v2.0/account/defi/activities?` + 
      `address=${address}&` +
      `token=${tokenAddress}&` +
      `activity_type[]=ACTIVITY_TOKEN_SWAP&` +
      `activity_type[]=ACTIVITY_AGG_TOKEN_SWAP&` +
      `page=1&` +
      `page_size=100&` +
      `sort_by=block_time&` +
      `sort_order=desc`;

    console.log('Fetching trade history:', {
      url,
      address,
      tokenAddress,
      apiKey: process.env.SOLSCAN_API_KEY ? 'present' : 'missing'
    });

    const response = await fetch(url, requestOptions);

    console.log('Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Error response body:', errorText);
      
      // If we get a 404, try without the token parameter
      if (response.status === 404) {
        const urlWithoutToken = `${baseUrl}/v2.0/account/defi/activities?` + 
          `address=${address}&` +
          `activity_type[]=ACTIVITY_TOKEN_SWAP&` +
          `activity_type[]=ACTIVITY_AGG_TOKEN_SWAP&` +
          `page=1&` +
          `page_size=100&` +
          `sort_by=block_time&` +
          `sort_order=desc`;
          
        console.log('Retrying without token parameter:', urlWithoutToken);
        
        const retryResponse = await fetch(urlWithoutToken, requestOptions);
        console.log('Retry response status:', retryResponse.status, retryResponse.statusText);
        
        if (retryResponse.ok) {
          const retryData: SolscanResponse = await retryResponse.json();
          console.log('Retry response data:', {
            success: retryData.success,
            dataLength: retryData.data?.length || 0,
            hasMetadata: !!retryData.metadata
          });
          
          if (retryData.success && retryData.data) {
            // Filter activities for our token
            retryData.data = retryData.data.filter(activity => {
              const routes = activity.routers.child_routers || [activity.routers];
              return routes.some(route => 
                route.token1.toLowerCase() === tokenAddress.toLowerCase() ||
                route.token2.toLowerCase() === tokenAddress.toLowerCase()
              );
            });
            return processActivities(retryData.data, tokenAddress);
          }
        } else {
          const retryErrorText = await retryResponse.text();
          console.warn('Retry error response:', retryErrorText);
        }
      }
      
      return { entryPrice: 0, lastTradeTimestamp: Date.now() / 1000, isPartialHistory: false };
    }

    const data: SolscanResponse = await response.json();
    
    console.log('Response data:', {
      success: data.success,
      dataLength: data.data?.length || 0,
      hasMetadata: !!data.metadata
    });

    if (!data.success || !data.data || !Array.isArray(data.data)) {
      console.warn(`Invalid response format for holder ${address}`, data);
      return { entryPrice: 0, lastTradeTimestamp: Date.now() / 1000, isPartialHistory: false };
    }

    return processActivities(data.data, tokenAddress);
    
  } catch (error) {
    console.error('Error fetching trade history:', error);
    return { entryPrice: 0, lastTradeTimestamp: Date.now() / 1000, isPartialHistory: false };
  }
}

function processActivities(activities: SolscanActivity[], tokenAddress: string): { entryPrice: number; lastTradeTimestamp: number; isPartialHistory: boolean } {
  if (activities.length === 0) {
    return { entryPrice: 0, lastTradeTimestamp: Date.now() / 1000, isPartialHistory: false };
  }

  let totalTokens = 0;
  let totalValue = 0;
  let lastTradeTimestamp = activities[0].block_time;

  // Sort activities by time, oldest first to calculate accurate entry price
  const sortedActivities = [...activities].sort((a, b) => a.block_time - b.block_time);

  for (const activity of sortedActivities) {
    // For aggregated swaps, we need to look at child_routers
    const routes = activity.routers.child_routers || [activity.routers];
    
    for (const route of routes) {
      const isTokenBuy = route.token2.toLowerCase() === tokenAddress.toLowerCase();
      const isTokenSell = route.token1.toLowerCase() === tokenAddress.toLowerCase();
      
      if (!isTokenBuy && !isTokenSell) continue;

      // Get the token amounts
      const tokenAmount = Number(isTokenBuy ? route.amount2 : route.amount1);
      const otherAmount = Number(isTokenBuy ? route.amount1 : route.amount2);
      const tokenDecimals = isTokenBuy ? route.token2_decimals : route.token1_decimals;
      const otherDecimals = isTokenBuy ? route.token1_decimals : route.token2_decimals;

      if (isNaN(tokenAmount) || isNaN(otherAmount)) {
        console.warn('Invalid amount values in trade');
        continue;
      }

      // Adjust amounts for decimals
      const adjustedTokenAmount = tokenAmount / Math.pow(10, tokenDecimals);
      const adjustedOtherAmount = otherAmount / Math.pow(10, otherDecimals);

      // For USDC/USDT trades, the value is already in USD
      const isUSDPair = route.token1 === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' || 
                        route.token2 === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ||
                        route.token1 === 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' ||
                        route.token2 === 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

      // For SOL trades, convert using activity.value
      const isSOLPair = route.token1 === 'So11111111111111111111111111111111111111112' ||
                       route.token2 === 'So11111111111111111111111111111111111111112';

      // Calculate the USD value of the trade
      let tradeValueUSD: number;
      if (isUSDPair) {
        // If trading against USDC/USDT, use that amount directly
        tradeValueUSD = isTokenBuy ? adjustedOtherAmount : adjustedTokenAmount;
      } else if (isSOLPair && activity.value) {
        // If trading against SOL, use the activity.value which is in USD
        tradeValueUSD = activity.value;
      } else {
        // Fallback: use the activity.value
        tradeValueUSD = activity.value || 0;
      }

      console.log('Processing trade:', {
        isTokenBuy,
        tokenAmount: adjustedTokenAmount,
        otherAmount: adjustedOtherAmount,
        tradeValueUSD,
        isUSDPair,
        isSOLPair
      });

      if (isTokenBuy) {
        totalTokens += adjustedTokenAmount;
        totalValue += tradeValueUSD;
      } else {
        // For sells, remove tokens at the current average price
        const currentAvgPrice = totalTokens > 0 ? totalValue / totalTokens : tradeValueUSD / adjustedTokenAmount;
        totalTokens -= adjustedTokenAmount;
        totalValue -= adjustedTokenAmount * currentAvgPrice;

        // Ensure we don't go negative due to rounding
        if (totalTokens < 0) totalTokens = 0;
        if (totalValue < 0) totalValue = 0;
      }

      console.log('Running totals:', {
        totalTokens,
        totalValue,
        currentPrice: totalTokens > 0 ? totalValue / totalTokens : 0
      });
    }
  }

  const entryPrice = totalTokens > 0 ? totalValue / totalTokens : 0;
  
  // If we have max page size of activities, there might be more history
  const isPartialHistory = activities.length === 100;

  console.log('Final calculation:', {
    totalTokens,
    totalValue,
    entryPrice,
    lastTradeTimestamp,
    isPartialHistory,
    processedTrades: activities.length
  });

  return { 
    entryPrice,
    lastTradeTimestamp,
    isPartialHistory 
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenAddress = searchParams.get('tokenAddress');
    const currentPrice = parseFloat(searchParams.get('currentPrice') || '0');
    
    if (!tokenAddress) {
      return NextResponse.json({ error: 'Token address is required' }, { status: 400 });
    }

    if (!currentPrice) {
      return NextResponse.json({ error: 'Current price is required' }, { status: 400 });
    }

    // Initialize Solana connection to get token decimals
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    const mintInfo = await getMint(connection, new PublicKey(tokenAddress));
    const decimals = mintInfo.decimals;

    // Get top holders using the existing function
    const holders = await getTopHolders(tokenAddress);
    
    // Transform holders data into whale analysis format with trade history
    const whaleAnalysis: (WhaleAnalysis & { isPartialHistory?: boolean })[] = await Promise.all(
      holders.map(async (holder: any) => {
        // Get raw amount and adjust for decimals
        const rawAmount = holder.amount || parseFloat(holder.balance || '0');
        const adjustedAmount = rawAmount / Math.pow(10, decimals);

        // Get trade history and calculate entry price
        const { entryPrice, lastTradeTimestamp, isPartialHistory } = await getHolderTradeHistory(
          holder.owner || holder.address,
          tokenAddress
        );

        // If no entry price found, use current price
        const actualEntryPrice = entryPrice || currentPrice;
        const profitLossPercent = ((currentPrice - actualEntryPrice) / actualEntryPrice) * 100;

        return {
          address: holder.owner || holder.address,
          entryPrice: actualEntryPrice,
          currentPrice,
          profitLossPercent,
          totalValue: adjustedAmount * currentPrice,
          tokenAmount: adjustedAmount,
          lastTradeTimestamp,
          isPartialHistory
        };
      })
    ).then(results => results.slice(0, 10)); // Get top 10 holders

    return NextResponse.json({
      whales: whaleAnalysis,
      tokenAddress,
      currentPrice,
      timestamp: Date.now(),
      note: "Entry prices are calculated from recent trade history only. Historical data may be incomplete."
    });

  } catch (error) {
    console.error('Error in whale analysis:', error);
    return NextResponse.json({ error: 'Failed to analyze whale activity' }, { status: 500 });
  }
} 