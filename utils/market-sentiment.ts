// utils/market-sentiment.ts
interface FearGreedData {
    value: number;
    classification: string;
    timestamp: string;
  }
  
  interface FundingRateData {
    symbol: string;
    rate: number;
    timestamp: string;
  }
  
  export async function getFearGreedIndex(): Promise<FearGreedData> {
    try {
      // Using Alternative.me API for Fear & Greed Index
      const response = await fetch('https://api.alternative.me/fng/');
      const data = await response.json();
      
      return {
        value: parseInt(data.data[0].value),
        classification: data.data[0].value_classification,
        timestamp: data.data[0].timestamp
      };
    } catch (error) {
      throw new Error('Failed to fetch Fear & Greed Index');
    }
  }
  
  export async function getFundingRates(): Promise<FundingRateData[]> {
    try {
      // Using Binance API for funding rates
      const response = await fetch('https://fapi.binance.com/fapi/v1/fundingRate');
      const data = await response.json();
      
      return data
        .filter((rate: any) => rate.symbol.includes('BTC') || rate.symbol.includes('ETH'))
        .map((rate: any) => ({
          symbol: rate.symbol,
          rate: parseFloat(rate.fundingRate) * 100, // Convert to percentage
          timestamp: new Date(rate.fundingTime).toISOString()
        }));
    } catch (error) {
      throw new Error('Failed to fetch Funding Rates');
    }
  }