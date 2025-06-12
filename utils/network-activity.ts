interface NetworkActivity {
    transactionCount: number;
    timeframe: string;
  }
  
interface TransactionVolume {
    volumeSOL: number;
    volumeUSD: number;
    priceChange24h: number;
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
      
      // Calculate total transaction count
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
      const url = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true';
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch transaction volume: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.solana) {
        throw new Error('Invalid response format: missing solana data');
      }

      const solPrice = data.solana.usd;
      const volumeUSD = data.solana.usd_24h_vol;
      const volumeSOL = volumeUSD / solPrice;
      const priceChange24h = data.solana.usd_24h_change || 0;

      return {
        volumeSOL,
        volumeUSD,
        priceChange24h,
        timeframe: '24h'
      };
    } catch (error) {
      console.error('Error fetching transaction volume:', error);
      return {
        volumeSOL: 0,
        volumeUSD: 0,
        priceChange24h: 0,
        timeframe: '24h'
      };
    }
  }