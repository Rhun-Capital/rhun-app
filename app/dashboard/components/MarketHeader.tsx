'use client';

import { useState, useEffect } from 'react';
import { getTotalCryptoMarketCap, getFearGreedIndex } from '@/utils/agent-tools';

interface MarketHeaderProps {
  darkMode: boolean;
}

export default function MarketHeader({ darkMode }: MarketHeaderProps) {
  const [marketData, setMarketData] = useState<any>(null);
  const [fearGreedData, setFearGreedData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [flashingItems, setFlashingItems] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    async function fetchData() {
      try {
        const [marketCapData, fgIndex] = await Promise.all([
          getTotalCryptoMarketCap(),
          getFearGreedIndex()
        ]);
        
        setMarketData(marketCapData);
        setFearGreedData(fgIndex);
        setLoading(false);
        
        // Flash the items that changed
        const newFlashing = { ...flashingItems };
        Object.keys(newFlashing).forEach(key => {
          newFlashing[key] = true;
        });
        setFlashingItems(newFlashing);
        
        // Turn off flashing after a delay
        setTimeout(() => {
          setFlashingItems({});
        }, 1000);
      } catch (error) {
        console.error('Error fetching market data:', error);
        setLoading(false);
      }
    }

    fetchData();
    
    // Set up a refresh interval - 30 seconds
    const intervalId = setInterval(fetchData, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Format large numbers
  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  // Get color for percentage changes
  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return darkMode ? 'text-gray-400' : 'text-gray-600';
  };

  // Get color for fear & greed index
  const getFearGreedColor = (value: number) => {
    if (value >= 75) return 'text-green-500'; // Extreme Greed
    if (value >= 55) return 'text-green-400'; // Greed
    if (value >= 45) return 'text-yellow-400'; // Neutral
    if (value >= 25) return 'text-orange-500'; // Fear
    return 'text-red-500'; // Extreme Fear
  };

  return (
    <div className={`w-full py-1 px-3 border-b ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-300'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-lg font-bold font-mono mr-3">MARKET TERMINAL</h1>
          
          <div className="hidden md:flex space-x-4">
            {loading ? (
              <div className="animate-pulse flex space-x-4">
                <div className="h-4 w-28 bg-gray-700 rounded"></div>
                <div className="h-4 w-28 bg-gray-700 rounded"></div>
                <div className="h-4 w-28 bg-gray-700 rounded"></div>
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-1">
                  <span className="text-xs font-mono uppercase">Total Cap:</span>
                  <span className={`font-mono font-semibold ${flashingItems['marketCap'] ? 'bg-green-900 bg-opacity-50' : ''}`}>
                    ${formatLargeNumber(marketData?.totalMarketCap || 0)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <span className="text-xs font-mono uppercase">24h Vol:</span>
                  <span className={`font-mono font-semibold ${flashingItems['volume'] ? 'bg-green-900 bg-opacity-50' : ''}`}>
                    ${formatLargeNumber(marketData?.totalVolume || 0)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <span className="text-xs font-mono uppercase">BTC Dom:</span>
                  <span className={`font-mono font-semibold ${flashingItems['btcDom'] ? 'bg-green-900 bg-opacity-50' : ''}`}>
                    {(marketData?.marketCapPercentage?.btc || 0).toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <span className="text-xs font-mono uppercase">ETH Dom:</span>
                  <span className={`font-mono font-semibold ${flashingItems['ethDom'] ? 'bg-green-900 bg-opacity-50' : ''}`}>
                    {(marketData?.marketCapPercentage?.eth || 0).toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <span className="text-xs font-mono uppercase">24h Chg:</span>
                  <span className={`font-mono font-semibold ${getChangeColor(marketData?.marketCapChange24h || 0)}`}>
                    {(marketData?.marketCapChange24h || 0) > 0 ? '+' : ''}
                    {(marketData?.marketCapChange24h || 0).toFixed(2)}%
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {loading ? (
            <div className="animate-pulse h-4 w-20 bg-gray-700 rounded"></div>
          ) : (
            <div className="flex items-center space-x-1">
              <span className="text-xs font-mono uppercase">Fear & Greed:</span>
              <span className={`font-mono font-semibold ${getFearGreedColor(fearGreedData?.value || 0)}`}>
                {fearGreedData?.value || '--'}
              </span>
              <span className="text-xs font-mono">
                ({fearGreedData?.classification || '--'})
              </span>
            </div>
          )}
          
          <div className={`h-5 px-2 rounded text-xs font-mono font-bold flex items-center justify-center 
            ${darkMode ? 'bg-green-900 text-green-200' : 'bg-green-600 text-white'}`}>
            LIVE
          </div>
        </div>
      </div>
    </div>
  );
} 