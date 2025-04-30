'use client';

import { useState, useEffect } from 'react';
import { getAccountActivities } from '@/utils/agent-tools';

interface ActivityFeedProps {
  darkMode: boolean;
  chainId: string;
  address?: string;
}

export default function ActivityFeed({ darkMode, chainId, address }: ActivityFeedProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(!address);

  // For demo purposes, we'll use some sample addresses for each chain
  const getDefaultAddress = () => {
    switch (chainId) {
      case 'solana':
        return '4Rf9mGD7FeYknun5JczX5nGLTfQuS1GRjwADeasMSfF7';
      case 'ethereum':
        return '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
      case 'arbitrum':
        return '0x1f9090aae28b8a3dceadf281b0f12828e676c326';
      default:
        return '4Rf9mGD7FeYknun5JczX5nGLTfQuS1GRjwADeasMSfF7';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1e9) return `${(amount / 1e9).toFixed(2)}B`;
    if (amount >= 1e6) return `${(amount / 1e6).toFixed(2)}M`;
    if (amount >= 1e3) return `${(amount / 1e3).toFixed(2)}K`;
    return amount.toFixed(2);
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getActivityIcon = (type: string) => {
    if (type.includes('SWAP')) return '↔️';
    if (type.includes('SEND')) return '↗️';
    if (type.includes('RECEIVE')) return '↘️';
    if (type.includes('MINT')) return '✨';
    if (type.includes('BURN')) return '🔥';
    return '🔄';
  };

  const getActivityColor = (type: string) => {
    if (type.includes('SWAP')) return 'text-blue-500';
    if (type.includes('SEND')) return 'text-red-500';
    if (type.includes('RECEIVE')) return 'text-green-500';
    if (type.includes('MINT')) return 'text-purple-500';
    if (type.includes('BURN')) return 'text-orange-500';
    return 'text-gray-500';
  };

  // Generate some sample transactions for the demo mode
  const generateDemoTransactions = () => {
    const activityTypes = [
      'ACTIVITY_TOKEN_SWAP',
      'ACTIVITY_SEND',
      'ACTIVITY_RECEIVE',
      'ACTIVITY_MINT',
      'ACTIVITY_BURN'
    ];
    
    const tokens = {
      'SOL': { address: 'So11111111111111111111111111111111111111112', name: 'Solana' },
      'USDC': { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', name: 'USD Coin' },
      'ETH': { address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', name: 'Ethereum' },
      'USDT': { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', name: 'Tether' },
      'BTC': { address: '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E', name: 'Bitcoin' }
    };
    
    const demoTxs = [];
    const now = Math.floor(Date.now() / 1000);
    
    for (let i = 0; i < 15; i++) {
      const randomType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      const tokenSymbols = Object.keys(tokens);
      const token1 = tokenSymbols[Math.floor(Math.random() * tokenSymbols.length)];
      
      let token2 = token1;
      while (token2 === token1) {
        token2 = tokenSymbols[Math.floor(Math.random() * tokenSymbols.length)];
      }
      
      const amount1 = parseFloat((Math.random() * 100).toFixed(3));
      const amount2 = parseFloat((Math.random() * 100).toFixed(3));
      
      const tx = {
        block_time: now - (i * 60 * 5 + Math.floor(Math.random() * 300)),
        activity_type: randomType,
        tx_address: `tx_${Math.random().toString(36).substring(2, 15)}`,
        value: randomType.includes('SWAP') ? amount2 : amount1,
        from_address: getDefaultAddress(),
        tokens: {
          token1: {
            symbol: token1,
            amount: amount1,
            ...tokens[token1 as keyof typeof tokens]
          },
          token2: randomType.includes('SWAP') ? {
            symbol: token2,
            amount: amount2,
            ...tokens[token2 as keyof typeof tokens]
          } : null
        }
      };
      
      demoTxs.push(tx);
    }
    
    return demoTxs.sort((a, b) => b.block_time - a.block_time);
  };

  useEffect(() => {
    async function fetchActivityData() {
      setLoading(true);
      
      if (demoMode) {
        // Generate sample data for demo mode
        setTransactions(generateDemoTransactions());
        setLoading(false);
        return;
      }
      
      try {
        const addressToUse = address || getDefaultAddress();
        
        if (chainId === 'solana') {
          // Only works for Solana for now with the current implementation
          const activitiesData = await getAccountActivities({
            address: addressToUse,
            page: 1,
            pageSize: 15,
            sortBy: 'block_time',
            sortOrder: 'desc'
          });
          
          setTransactions(activitiesData.data || []);
        } else {
          // For other chains we'll use demo data for now
          setTransactions(generateDemoTransactions());
        }
      } catch (error) {
        console.error('Error fetching activity data:', error);
        // Fall back to demo data on error
        setTransactions(generateDemoTransactions());
      } finally {
        setLoading(false);
      }
    }

    fetchActivityData();
    
    // Refresh every 30 seconds
    const intervalId = setInterval(fetchActivityData, 30000);
    return () => clearInterval(intervalId);
  }, [address, chainId, demoMode]);

  return (
    <div className={`rounded-md overflow-hidden ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-300'}`}>
      <div className={`p-3 ${darkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'} flex justify-between items-center`}>
        <h3 className="font-semibold font-mono">Recent Activity</h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono">{demoMode ? 'DEMO' : 'LIVE'}</span>
          <div className={`h-2 w-2 rounded-full ${demoMode ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
        </div>
      </div>
      
      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No recent activity found
          </div>
        ) : (
          <div className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
            {transactions.map((tx, index) => (
              <div 
                key={tx.tx_address || index}
                className={`p-2 text-xs ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}
              >
                <div className="flex justify-between mb-1">
                  <div className="font-mono text-gray-500">
                    {formatTimestamp(tx.block_time)}
                  </div>
                  <div className={`font-semibold ${getActivityColor(tx.activity_type)}`}>
                    {getActivityIcon(tx.activity_type)} {tx.activity_type.replace('ACTIVITY_', '')}
                  </div>
                </div>
                
                {tx.activity_type.includes('SWAP') ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold">{formatAmount(tx.tokens?.token1?.amount || 0)}</span>
                      <span className="ml-1">{tx.tokens?.token1?.symbol}</span>
                      <span className="mx-1">→</span>
                      <span className="font-semibold">{formatAmount(tx.tokens?.token2?.amount || 0)}</span>
                      <span className="ml-1">{tx.tokens?.token2?.symbol}</span>
                    </div>
                    <div className="font-mono text-gray-500">
                      {truncateAddress(tx.tx_address)}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold">{formatAmount(tx.tokens?.token1?.amount || tx.value || 0)}</span>
                      <span className="ml-1">{tx.tokens?.token1?.symbol}</span>
                    </div>
                    <div className="font-mono text-gray-500">
                      {truncateAddress(tx.tx_address)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 