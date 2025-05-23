import React, { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { TrendingUp, TrendingDown } from 'lucide-react';
import LoadingIndicator from '@/components/loading-indicator';

interface WhaleAnalysisProps {
  tokenAddress: string;
  currentPrice?: number;
}

interface WhaleData {
  address: string;
  entryPrice: number;
  currentPrice: number;
  profitLossPercent: number;
  totalValue: number;
  tokenAmount: number;
  lastTradeTimestamp: number;
}

const WhaleAnalysis: React.FC<WhaleAnalysisProps> = ({ tokenAddress, currentPrice }) => {
  const [whales, setWhales] = useState<WhaleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getAccessToken } = usePrivy();

  useEffect(() => {
    const fetchWhaleData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const accessToken = await getAccessToken();
        const response = await fetch(`/api/whales/analysis?tokenAddress=${tokenAddress}&currentPrice=${currentPrice}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch whale data');
        }

        const data = await response.json();
        setWhales(data.whales);
      } catch (err) {
        setError('Failed to load whale analysis');
        console.error('Error fetching whale data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (tokenAddress && currentPrice) {
      fetchWhaleData();
    }
  }, [tokenAddress, currentPrice, getAccessToken]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <LoadingIndicator />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 text-sm p-4">
        {error}
      </div>
    );
  }

  if (!whales.length) {
    return (
      <div className="text-zinc-400 text-sm p-4">
        No whale activity data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {whales.map((whale, index) => (
        <div key={whale.address} className="bg-zinc-900 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-medium text-white">
              Whale #{index + 1}
            </div>
            <div className="text-sm text-zinc-400">
              Last Trade: {new Date(whale.lastTradeTimestamp).toLocaleDateString()}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-zinc-500">Entry Price</div>
              <div className="text-sm font-medium text-white">
                ${whale.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
              </div>
            </div>
            
            <div>
              <div className="text-xs text-zinc-500">Current Price</div>
              <div className="text-sm font-medium text-white">
                ${whale.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
              </div>
            </div>
            
            <div>
              <div className="text-xs text-zinc-500">Token Amount</div>
              <div className="text-sm font-medium text-white">
                {whale.tokenAmount.toLocaleString()}
              </div>
            </div>
            
            <div>
              <div className="text-xs text-zinc-500">Total Value</div>
              <div className="text-sm font-medium text-white">
                ${whale.totalValue.toLocaleString()}
              </div>
            </div>
          </div>
          
          <div className="mt-2 flex items-center">
            <div className="text-xs text-zinc-500 mr-2">Profit/Loss:</div>
            <div className={`text-sm font-medium flex items-center gap-1 ${
              whale.profitLossPercent >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {whale.profitLossPercent >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(whale.profitLossPercent).toFixed(2)}%
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WhaleAnalysis; 