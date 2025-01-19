interface NetworkActivity {
    transactionCount: number;
    timeframe: string;
  }
  
interface TransactionVolume {
    volumeSOL: number;
    volumeUSD: number;
    timeframe: string;
  }
  

  export async function getTransactionCount(timeframe: string = '24h'): Promise<NetworkActivity> {
    try {
      const HELIUS_RPC_URL = process.env.HELIUS_RPC_URL;
      const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
      if (!HELIUS_RPC_URL) {
        throw new Error('Helius RPC URL not configured');
      }
  
      const response = await fetch(`${HELIUS_RPC_URL}?api-key=${HELIUS_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'network-activity',
          method: 'getRecentPerformanceSamples',
          params: [4], // Get last 4 samples (1 hour each)
        }),
      });
  
      const data = await response.json();      
      // Calculate total transaction count and volume
      const transactionCount = data.result.reduce(
        (acc: number, sample: any) => acc + sample.numTransactions,
        0
      );
  
      return {
        transactionCount,
        timeframe
      };
    } catch (error) {
      console.error('Error fetching network activity:', error);
      throw new Error('Failed to fetch network activity data');
    }
    
  }


  export async function getTransactionVolume(): Promise<TransactionVolume> {
    try {
      // Using Coingecko's API which is more reliable for server-side requests
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_vol=true',
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch transaction volume');
      }
  
      const data = await response.json();
      const solPrice = data.solana.usd;
      const volumeUSD = data.solana.usd_24h_vol;
      const volumeSOL = volumeUSD / solPrice;
  
      return {
        volumeSOL,
        volumeUSD,
        timeframe: '24h' // Coingecko provides 24h volume by default
      };
    } catch (error) {
      console.error('Error fetching transaction volume:', error);
      // Return some fallback data instead of throwing
      return {
        volumeSOL: 0,
        volumeUSD: 0,
        timeframe: '24h'
      };
    }
  }