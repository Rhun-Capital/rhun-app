// app/api/tokens/route.ts
import { NextResponse } from 'next/server'
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'

interface TokenAccount {
  token_account: string
  token_address: string
  amount: number
  token_decimals: number
  owner: string
}

interface TokenMetadata {
  token_address: string
  token_name: string
  token_symbol: string
  token_icon: string
}

interface SolscanResponse {
  success: boolean
  data: TokenAccount[]
  metadata: {
    tokens: {
      [key: string]: TokenMetadata
    }
  }
}

interface JupiterPriceResponse {
  data: {
    [mintAddress: string]: {
      id: string
      mintSymbol: string
      vsToken: string
      vsTokenSymbol: string
      price: number
    }
  }
}

const SOLSCAN_API_URL = 'https://pro-api.solscan.io/v2.0/account/token-accounts'
const JUPITER_PRICE_API_URL = 'https://api.jup.ag/price/v2'
const WRAPPED_SOL_MINT = 'So11111111111111111111111111111111111111112'

// List of known stablecoin addresses
const STABLECOIN_ADDRESSES = new Set([
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
  'USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX',  // USDH
  // Add more stablecoins as needed
])

function formatTokenBalance(amount: number, decimals: number): number {
  return amount / Math.pow(10, decimals)
}

async function getTokenPrices(tokenAddresses: string[]): Promise<{ [key: string]: number }> {
  try {
    // Always include WRAPPED_SOL_MINT to get SOL price
    const addressesToFetch = [...new Set([WRAPPED_SOL_MINT, ...tokenAddresses.filter(addr => !STABLECOIN_ADDRESSES.has(addr))])];
    
    if (addressesToFetch.length === 0) {
      return {};
    }

    const queryParams = addressesToFetch.map(String).join(',');

    const response = await fetch(`${JUPITER_PRICE_API_URL}?ids=${queryParams}`)
    if (!response.ok) {
      throw new Error('Failed to fetch token prices')
    }

    const priceData: JupiterPriceResponse = await response.json()
    
    // Create a price map including both Jupiter prices and stablecoin prices
    const priceMap: { [key: string]: number } = {}
    
    // Add Jupiter prices
    Object.entries(priceData.data).forEach(([mintAddress, data]) => {
      if (data)
        priceMap[mintAddress] = data.price
    })
    
    // Add stablecoin prices
    tokenAddresses.forEach(addr => {
      if (STABLECOIN_ADDRESSES.has(addr)) {
        priceMap[addr] = 1 // Stablecoins are always $1
      }
    })

    return priceMap
  } catch (error) {
    console.error('Error fetching token prices:', error)
    return {}
  }
}

async function enrichTokenData(
  data: TokenAccount[], 
  metadata: { tokens: { [key: string]: TokenMetadata } }
) {
  // Get all unique token addresses
  const tokenAddresses = [...new Set(data.map(token => token.token_address))]
  
  // Fetch prices for all tokens
  const priceMap = await getTokenPrices(tokenAddresses)

  return data.map(token => {
    const tokenMetadata = metadata.tokens[token.token_address]
    const formattedAmount = formatTokenBalance(token.amount, token.token_decimals)
    const price = priceMap[token.token_address] || 0
    
    return {
      ...token,
      formatted_amount: formattedAmount,
      token_name: tokenMetadata?.token_name || 'Unknown Token',
      token_symbol: tokenMetadata?.token_symbol || '???',
      token_icon: tokenMetadata?.token_icon || null,
      usd_price: price,
      usd_value: formattedAmount * price
    }
  })
}

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
)  {
  try {
    const { address } = params
    
    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Get token balances
    const queryParams = new URLSearchParams({
      address,
      type: 'token',
      page: '1',
      page_size: '40',
      hide_zero: 'true'
    })

    const response = await fetch(
      `${SOLSCAN_API_URL}?${queryParams.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'token': process.env.SOLSCAN_API_KEY || ''
        },
        cache: 'no-store'
      }
    )

    if (!response.ok) {
      throw new Error(`Solscan API error: ${response.status}`)
    }

    const rawData: SolscanResponse = await response.json()

    if (!rawData.success) {
      throw new Error('Failed to fetch token data from Solscan')
    }

    // Filter out SOL/Wrapped SOL from token data
    const nonSolTokens = rawData.data.filter(token => 
      token.token_address !== WRAPPED_SOL_MINT
    );

    // Enrich the non-SOL tokens data
    const enrichedData = await enrichTokenData(nonSolTokens, rawData.metadata)

    // Get SOL balance for total value calculation only
    const connection = new Connection(
      process.env.HELIUS_RPC_URL ? 
        `${process.env.HELIUS_RPC_URL}?api-key=${process.env.HELIUS_API_KEY}` : 
        'https://mainnet.helius-rpc.com', 
      'confirmed'
    );
    const pubKey = new PublicKey(address);
    const solBalance = await connection.getBalance(pubKey);
    const solInWallet = solBalance / LAMPORTS_PER_SOL;

    // Get SOL price
    const prices = await getTokenPrices([WRAPPED_SOL_MINT]);
    const solPrice = prices[WRAPPED_SOL_MINT] || 0;
    const solUsdValue = solInWallet * solPrice;

    // Create SOL token entry
    const solTokenEntry = {
      token_account: 'native',
      token_address: WRAPPED_SOL_MINT,
      amount: solBalance,
      token_decimals: 9,
      owner: address,
      formatted_amount: solInWallet,
      token_name: 'Solana',
      token_symbol: 'SOL',
      token_icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
      usd_price: solPrice,
      usd_value: solUsdValue
    };

    // Include SOL in the data array
    const allTokens = [solTokenEntry, ...enrichedData];

    // Calculate total portfolio value including SOL
    const tokensValue = enrichedData.reduce((sum, token) => sum + (token.usd_value || 0), 0);
    const totalUsdValue = tokensValue + solUsdValue;

    return NextResponse.json({
      success: true,
      data: allTokens,
      metadata: rawData.metadata,
      portfolio: {
        total_usd_value: totalUsdValue,
        has_sol: solInWallet > 0
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    })

  } catch (error) {
    console.error('Error fetching tokens:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch token data'
      },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0