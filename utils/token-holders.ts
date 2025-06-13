import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

interface TokenHolder {
  address: string;
  amount: number;
  tokenAddress: string;
  lastActivity?: Date;
}

interface ActiveTrader {
  walletAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  lastActivity: Date;
}

interface SolscanTokenHolder {
  owner: string;
  amount: string;
  percentage: number;
}

interface SolscanTransaction {
  blockTime: number;
  signature: string;
  type: string;
}

interface SolscanResponse {
  success: boolean;
  data: {
    items: SolscanTokenHolder[];
  };
}

interface SolscanActivityResponse {
  success: boolean;
  data: Array<{
    blockTime: number;
    signature: string;
    type: string;
  }>;
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Retry ${i + 1}/${retries} for ${url}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
    }
  }
  throw new Error('All retries failed');
}

export async function getTokenHolders(
  tokenAddress: string,
  limit: number = 100
): Promise<TokenHolder[]> {
  try {
    const allHolders: TokenHolder[] = [];
    const pageSize = 40; // Maximum allowed by Solscan API
    let currentPage = 1;
    
    while (allHolders.length < limit) {
      const url = `https://pro-api.solscan.io/v2.0/token/holders?` + 
        new URLSearchParams({
          address: tokenAddress,
          page: currentPage.toString(),
          page_size: pageSize.toString()
        });

      console.log(`Fetching holders page ${currentPage} from:`, url);

      const response = await fetchWithRetry(url, {
        headers: {
          'token': process.env.SOLSCAN_API_KEY || '',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Solscan API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json() as SolscanResponse;
      if (!result.success) {
        throw new Error('Failed to get holder data from Solscan');
      }

      const holders = result.data.items.map(holder => ({
        address: holder.owner,
        amount: Number(holder.amount),
        tokenAddress: tokenAddress,
      }));

      allHolders.push(...holders);

      // If we got fewer holders than the page size, we've reached the end
      if (holders.length < pageSize) {
        break;
      }

      currentPage++;
    }

    return allHolders.slice(0, limit);
  } catch (error) {
    console.error(`Error fetching token holders for ${tokenAddress}:`, error);
    return [];
  }
}

export async function checkWalletActivity(
  walletAddress: string,
  hours: number = 24
): Promise<boolean> {
  try {
    const params = new URLSearchParams({
      address: walletAddress,
      page: '1',
      page_size: '40',
      sort_by: 'block_time',
      sort_order: 'desc'
    });

    // Add activity_type as an array parameter
    params.append('activity_type[]', 'ACTIVITY_TOKEN_SWAP');
    params.append('activity_type[]', 'ACTIVITY_AGG_TOKEN_SWAP');

    const url = `https://pro-api.solscan.io/v2.0/account/defi/activities?${params}`;

    console.log('Checking activity for:', url);

    const response = await fetchWithRetry(url, {
      headers: {
        'token': process.env.SOLSCAN_API_KEY || '',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Solscan API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as SolscanActivityResponse;
    if (!data.success || !data.data || data.data.length === 0) return false;

    const mostRecentTx = data.data[0];
    const mostRecentTime = new Date(mostRecentTx.blockTime * 1000);
    const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);

    return mostRecentTime > hoursAgo;
  } catch (error) {
    console.error(`Error checking wallet activity for ${walletAddress}:`, error);
    return false;
  }
}

export async function findActiveTraders(
  tokenAddresses: string[],
  tokenSymbols: string[]
): Promise<ActiveTrader[]> {
  const activeTraders: ActiveTrader[] = [];
  
  for (let i = 0; i < tokenAddresses.length; i++) {
    const tokenAddress = tokenAddresses[i];
    const tokenSymbol = tokenSymbols[i];
    
    if (!tokenAddress || !tokenSymbol) {
      console.log('Skipping undefined token address or symbol');
      continue;
    }
    
    console.log(`Checking holders for ${tokenSymbol} (${tokenAddress})...`);
    const holders = await getTokenHolders(tokenAddress);
    
    for (const holder of holders) {
      console.log(`Checking activity for ${holder.address}...`);
      const isActive = await checkWalletActivity(holder.address);
      
      if (isActive) {
        activeTraders.push({
          walletAddress: holder.address,
          tokenAddress: tokenAddress,
          tokenSymbol: tokenSymbol,
          lastActivity: new Date(),
        });
      }
    }
  }
  
  return activeTraders;
} 