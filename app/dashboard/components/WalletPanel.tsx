'use client';

import { useState, useEffect } from 'react';
import { getPortfolioValue, getTokenHoldings } from '@/utils/agent-tools';

interface WalletPanelProps {
  darkMode: boolean;
}

export default function WalletPanel({ darkMode }: WalletPanelProps) {
  const [walletAddress, setWalletAddress] = useState<string>('3ZHMe2S56Z7YuziB4Ng4XCgoieT9KDR3V5ZYMoYuYjJd');
  const [totalValue, setTotalValue] = useState<number>(0);
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 14)}...${address.slice(-4)}`;
  };

  const refreshWallet = async () => {
    setRefreshing(true);
    try {
      await fetchWalletData();
    } catch (error) {
      console.error('Error refreshing wallet data:', error);
    }
    setTimeout(() => setRefreshing(false), 1000);
  };

  const fetchWalletData = async () => {
    try {
      // Fetch all holdings for this address
      const holdingsData = await getTokenHoldings(walletAddress);
      
      if (holdingsData && holdingsData.data) {
        // Set total value
        setTotalValue(holdingsData.totalUsdValue || 0);
        
        // Format and sort tokens by USD value
        const formattedTokens = holdingsData.data
          .sort((a: any, b: any) => (b.usd_value || 0) - (a.usd_value || 0))
          .map((token: any) => ({
            tokenAddress: token.token_address,
            name: token.token_name,
            symbol: token.token_symbol,
            amount: token.formatted_amount,
            usdValue: token.usd_value || 0,
            iconUrl: token.token_icon
          }));
        
        setTokens(formattedTokens);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
    
    // Refresh every 60 seconds
    const intervalId = setInterval(fetchWalletData, 60000);
    return () => clearInterval(intervalId);
  }, [walletAddress]);

  return (
    <div className={`rounded-md overflow-hidden ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-300'}`}>
      {/* Wallet header */}
      <div className={`p-3 ${darkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M6 10L10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="font-semibold text-lg">Wallet</span>
          </div>
          
          <div className="flex space-x-1">
            <button 
              onClick={refreshWallet}
              className={`p-1 rounded ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
              disabled={refreshing}
            >
              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4V9H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20 20V15H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 9C4 13.5 7.5 17 12 17C13.4 17 14.7 16.6 15.9 15.9L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20 15C20 10.5 16.5 7 12 7C10.6 7 9.3 7.4 8.1 8.1L4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            
            <button 
              onClick={() => navigator.clipboard.writeText(walletAddress)}
              className={`p-1 rounded ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M5 15V5C5 3.89543 5.89543 3 7 3H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mb-3">
          <div className="text-sm font-mono mb-1 flex items-center justify-between">
            <span>{truncateAddress(walletAddress)}</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          
          <div className="text-sm uppercase font-mono text-gray-500">Total Value</div>
          <div className="text-3xl font-bold">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button className={`flex flex-col items-center justify-center p-3 rounded-md ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
            <svg className="w-6 h-6 mb-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12L12 12M12 12L19 12M12 12L12 5M12 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-sm">Receive</span>
          </button>
          
          <button className={`flex flex-col items-center justify-center p-3 rounded-md ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
            <svg className="w-6 h-6 mb-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.0001 5L12.0001 19M12.0001 19L19 12M12.0001 19L5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm">Send</span>
          </button>
          
          <button className={`flex flex-col items-center justify-center p-3 rounded-md ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
            <svg className="w-6 h-6 mb-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 4V20M17 20L13 16M17 20L21 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 20L7 4M7 4L3 8M7 4L11 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm">Swap</span>
          </button>
        </div>
      </div>
      
      {/* Add Funds button */}
      <div className="p-3">
        <button className={`w-full py-3 rounded-md font-medium ${darkMode ? 'bg-blue-900 hover:bg-blue-800 text-blue-100' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
          Add Funds
        </button>
      </div>
      
      {/* Token list */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-4 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : (
          tokens.map((token, index) => (
            <div 
              key={token.tokenAddress || index}
              className={`p-3 flex items-center justify-between ${
                index !== tokens.length - 1 ? (darkMode ? 'border-b border-gray-800' : 'border-b border-gray-300') : ''
              }`}
            >
              <div className="flex items-center">
                {token.iconUrl ? (
                  <img src={token.iconUrl} alt={token.symbol} className="w-8 h-8 rounded-full mr-3" />
                ) : (
                  <div className={`w-8 h-8 rounded-full mr-3 flex items-center justify-center ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                    {token.symbol?.charAt(0) || '?'}
                  </div>
                )}
                <div>
                  <div className="font-semibold">{token.name || 'Unknown Token'}</div>
                  <div className="text-sm font-mono">
                    {token.amount.toLocaleString('en-US', { maximumFractionDigits: 6 })} {token.symbol}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">${token.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 