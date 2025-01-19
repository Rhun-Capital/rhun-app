// utils/portfolio.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { getPriceData } from '@/utils/prices'; // We'll create this
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

interface TokenBalance {
  mint: string;
  amount: number;
  usdValue: number;
  priceChange24h: number;
}

interface PortfolioData {
  totalValue: number;
  tokens: TokenBalance[];
  performanceMetrics: {
    change24h: number;
    changePercentage24h: number;
    topGainer: TokenBalance;
    topLoser: TokenBalance;
  };
}

export async function getPortfolioData(walletAddress: string): Promise<PortfolioData> {
  try {
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    
    // Get all token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(walletAddress),
      { programId: TOKEN_PROGRAM_ID }
    );

    // Get price data for all tokens
    const tokens = await Promise.all(
      tokenAccounts.value.map(async (account) => {
        const mint = account.account.data.parsed.info.mint;
        const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
        const priceData = await getPriceData(mint);
        return {
          mint,
          amount,
          usdValue: amount * priceData.price,
          priceChange24h: priceData.priceChange24h
        };
      })
    );

    // Calculate portfolio metrics
    const totalValue = tokens.reduce((acc, token) => acc + token.usdValue, 0);
    const topGainer = tokens.reduce((a, b) => 
      a.priceChange24h > b.priceChange24h ? a : b
    );
    const topLoser = tokens.reduce((a, b) => 
      a.priceChange24h < b.priceChange24h ? a : b
    );

    return {
      totalValue,
      tokens,
      performanceMetrics: {
        change24h: topGainer.priceChange24h,
        changePercentage24h: (topGainer.priceChange24h / tokens[0].usdValue) * 100,
        topGainer,
        topLoser
      }
    };
  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    throw error;
  }
}