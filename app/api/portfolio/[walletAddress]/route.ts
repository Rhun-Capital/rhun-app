// app/api/portfolio/[walletAddress]/route.ts
import { NextResponse } from 'next/server';
import { getSolanaConnection } from '@/utils/solana';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getBulkPriceData } from '@/utils/prices';
import { getTokenMetadata } from '@/utils/tokens';

export async function GET(
  request: Request,
  { params }: { params: { walletAddress: string } }
) {
  try {
    const heliusApiKey = process.env.HELIUS_API_KEY;
    if (!heliusApiKey) {
      throw new Error('HELIUS_API_KEY is not defined in environment variables');
    }
    const connection = getSolanaConnection(heliusApiKey);
    const pubKey = new PublicKey(params.walletAddress);

    // Get native SOL balance
    const solBalance = await connection.getBalance(pubKey);
    const solInWallet = solBalance / 1e9; // Convert lamports to SOL

    // Get token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      pubKey,
      { programId: TOKEN_PROGRAM_ID }
    );

    // Combine SOL with other token mints
    const WRAPPED_SOL_MINT = 'So11111111111111111111111111111111111111112';
    const tokenMints = [
      WRAPPED_SOL_MINT, // Include wrapped SOL for price lookup
      ...tokenAccounts.value.map(account => 
        account.account.data.parsed.info.mint
      )
    ];

    // Get price data for all tokens
    const priceData = await getBulkPriceData(tokenMints);
    const tokenMetadata = await getTokenMetadata(tokenMints);

    // Calculate holdings including native SOL
    const holdings = [
      // Add native SOL
      {
        mint: WRAPPED_SOL_MINT,
        symbol: 'SOL',
        name: 'Solana',
        amount: solInWallet,
        usdValue: solInWallet * (priceData[WRAPPED_SOL_MINT]?.price || 0),
        priceChange24h: priceData[WRAPPED_SOL_MINT]?.priceChange24h || 0,
        volume24h: priceData[WRAPPED_SOL_MINT]?.volume24h || 0,
        logoURI: tokenMetadata[WRAPPED_SOL_MINT]?.logoURI
      },
      // Add other tokens
      ...tokenAccounts.value.map(account => {
        const mintAddress = account.account.data.parsed.info.mint;
        const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
        const price = priceData[mintAddress]?.price || 0;
        
        return {
          mint: mintAddress,
          symbol: tokenMetadata[mintAddress]?.symbol || mintAddress.slice(0, 4) + '...',
          name: tokenMetadata[mintAddress]?.name || 'Unknown Token',
          logoURI: tokenMetadata[mintAddress]?.logoURI,
          amount,
          usdValue: amount * price,
          priceChange24h: priceData[mintAddress]?.priceChange24h || 0,
          volume24h: priceData[mintAddress]?.volume24h || 0
        };
      })
    ].filter(holding => holding.usdValue > 0).sort((a, b) => b.usdValue - a.usdValue);; // Filter out dust

    return NextResponse.json({ holdings });
  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio data' },
      { status: 500 }
    );
  }
}