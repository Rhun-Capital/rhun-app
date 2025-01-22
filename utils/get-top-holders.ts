// utils/getTopHolders.ts
interface TokenHolder {
    owner: string;
    amount: number;
    percentage: number;
  }
  
  export async function getTopHolders(address: string): Promise<TokenHolder[]> {
    try {
      const response = await fetch('https://pro-api.solscan.io/v2.0/token/holders?' + new URLSearchParams({
        address: address,
        page: '1',
        page_size: '10'  // Get top 10 holders
      }), {
        headers: {
          'token': process.env.SOLSCAN_API_KEY || ''
        }
      });
  
      if (!response.ok) {
        throw new Error('Failed to fetch token holders');
      }
  
      const result = await response.json();
      if (!result.success) {
        throw new Error('Failed to get holder data from Solscan');
      }
  
      return result.data.items.map((holder: any) => ({
        owner: holder.owner,
        amount: holder.amount,
        percentage: holder.percentage
      }));
  
    } catch (error) {
      console.error('Error fetching top holders:', error);
      throw error;
    }
  }
