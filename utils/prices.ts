// utils/prices.ts
interface PriceData {
    price: number;
    priceChange24h: number;
    volume24h?: number;
  }
  
  export async function getPriceData(tokenAddress: string): Promise<PriceData> {
    try {
      // Fetch price data from Jupiter
      const response = await fetch(
        `https://price.jup.ag/v4/price?ids=${tokenAddress}`
      );
  
      if (!response.ok) {
        throw new Error('Failed to fetch price data from Jupiter');
      }
  
      const data = await response.json();
      
      if (!data.data[tokenAddress]) {
        throw new Error(`No price data found for token ${tokenAddress}`);
      }
  
      return {
        price: data.data[tokenAddress].price || 0,
        priceChange24h: data.data[tokenAddress].price_24h_change || 0,
        volume24h: data.data[tokenAddress].volume_24h || 0
      };
    } catch (error) {
      console.error('Error fetching price data:', error);
      // Return default values if price fetch fails
      return {
        price: 0,
        priceChange24h: 0,
        volume24h: 0
      };
    }
  }
  
  // Helper function to get multiple token prices at once
  export async function getBulkPriceData(tokenAddresses: string[]): Promise<Record<string, PriceData>> {
    try {
      const response = await fetch(
        `https://api.jup.ag/price/v2?ids=${tokenAddresses.join(',')}`
      );
  
      if (!response.ok) {
        throw new Error('Failed to fetch bulk price data from Jupiter');
      }
  
      const data = await response.json();
      
      // Format the response into our PriceData structure
      const prices: Record<string, PriceData> = {};
      for (const token of tokenAddresses) {
        prices[token] = {
          price: data.data[token]?.price || 0,
          priceChange24h: data.data[token]?.price_24h_change || 0,
          volume24h: data.data[token]?.volume_24h || 0
        };
      }
  
      return prices;
    } catch (error) {
      console.error('Error fetching bulk price data:', error);
      // Return empty price data for all tokens if request fails
      return tokenAddresses.reduce((acc, token) => {
        acc[token] = {
          price: 0,
          priceChange24h: 0,
          volume24h: 0
        };
        return acc;
      }, {} as Record<string, PriceData>);
    }
  }