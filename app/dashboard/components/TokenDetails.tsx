'use client';

import { useState, useEffect } from 'react';
import { getTokenInfo, getTopHolders } from '@/utils/agent-tools';
import { DexScreenerPair, getTokenPools } from '@/utils/dexscreener';

interface TokenDetailsProps {
  darkMode: boolean;
  tokenAddress: string;
  chainId: string;
}

export default function TokenDetails({ darkMode, tokenAddress, chainId }: TokenDetailsProps) {
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [topHolders, setTopHolders] = useState<any[]>([]);
  const [tokenPools, setTokenPools] = useState<DexScreenerPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    async function fetchTokenData() {
      setLoading(true);
      try {
        // Fetch token information from agent-tools
        const tokenData = await getTokenInfo(tokenAddress);
        setTokenInfo(tokenData);
        
        // Fetch top holders if the chain is Solana (this only works for Solana)
        if (chainId === 'solana') {
          try {
            const holdersData = await getTopHolders(tokenAddress);
            setTopHolders(holdersData || []);
          } catch (err) {
            console.error('Error fetching top holders:', err);
            setTopHolders([]);
          }
        }
        
        // Fetch liquidity pools from DEX Screener
        try {
          const poolsData = await getTokenPools(chainId, tokenAddress);
          setTokenPools(poolsData || []);
        } catch (err) {
          console.error('Error fetching token pools:', err);
          setTokenPools([]);
        }
      } catch (error) {
        console.error('Error fetching token info:', error);
      } finally {
        setLoading(false);
      }
    }

    if (tokenAddress) {
      fetchTokenData();
    }
  }, [tokenAddress, chainId]);

  // Format large numbers with precision
  const formatNumber = (num: number | undefined, precision: number = 2) => {
    if (num === undefined) return 'N/A';
    if (num >= 1e9) return `${(num / 1e9).toFixed(precision)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(precision)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(precision)}K`;
    return num.toFixed(precision);
  };

  // Format large numbers with $ symbol
  const formatCurrency = (num: number | undefined, precision: number = 2) => {
    if (num === undefined) return 'N/A';
    return `$${formatNumber(num, precision)}`;
  };

  // Format percentage
  const formatPercent = (num: number | undefined) => {
    if (num === undefined) return 'N/A';
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}%`;
  };

  // Get color for percentage changes
  const getChangeColor = (value: number | undefined) => {
    if (value === undefined) return darkMode ? 'text-gray-400' : 'text-gray-600';
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return darkMode ? 'text-gray-400' : 'text-gray-600';
  };

  // Format addresses with truncation
  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className={`rounded-md overflow-hidden ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-300'}`}>
      {loading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : tokenInfo ? (
        <>
          {/* Token header */}
          <div className={`p-3 ${darkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'}`}>
            <div className="flex items-center mb-3">
              {tokenInfo.market?.image ? (
                <img src={tokenInfo.market.image} alt={tokenInfo.market?.symbol} className="w-8 h-8 rounded-full mr-2" />
              ) : (
                <div className={`w-8 h-8 rounded-full mr-2 flex items-center justify-center ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                  {tokenInfo.market?.symbol?.charAt(0) || tokenInfo.onchain?.symbol?.charAt(0) || '?'}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center">
                  <h2 className="text-lg font-bold mr-2">
                    {tokenInfo.market?.name || tokenInfo.onchain?.name || 'Unknown Token'}
                  </h2>
                  <span className="text-sm font-mono px-2 py-0.5 rounded-full bg-gray-800">
                    {tokenInfo.market?.symbol || tokenInfo.onchain?.symbol || '?'}
                  </span>
                </div>
                <div className="text-xs font-mono">{tokenAddress}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold font-mono">
                  ${tokenInfo.market?.currentPrice?.toFixed(tokenInfo.market?.currentPrice < 0.01 ? 6 : 2) || 'N/A'}
                </div>
                <div className={`text-sm font-mono ${getChangeColor(tokenInfo.market?.priceChange24h)}`}>
                  {formatPercent(tokenInfo.market?.priceChange24h)}
                </div>
              </div>
            </div>

            {/* Tab navigation */}
            <div className="flex border-b border-gray-800 -mx-3 px-3">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === 'overview' 
                    ? darkMode ? 'border-b-2 border-blue-500 text-blue-400' : 'border-b-2 border-blue-600 text-blue-600'
                    : ''
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('liquidity')}
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === 'liquidity' 
                    ? darkMode ? 'border-b-2 border-blue-500 text-blue-400' : 'border-b-2 border-blue-600 text-blue-600'
                    : ''
                }`}
              >
                Liquidity
              </button>
              {chainId === 'solana' && (
                <button
                  onClick={() => setActiveTab('holders')}
                  className={`px-4 py-2 font-medium text-sm ${
                    activeTab === 'holders' 
                      ? darkMode ? 'border-b-2 border-blue-500 text-blue-400' : 'border-b-2 border-blue-600 text-blue-600'
                      : ''
                  }`}
                >
                  Holders
                </button>
              )}
              <button
                onClick={() => setActiveTab('info')}
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === 'info' 
                    ? darkMode ? 'border-b-2 border-blue-500 text-blue-400' : 'border-b-2 border-blue-600 text-blue-600'
                    : ''
                }`}
              >
                Info
              </button>
            </div>
          </div>

          {/* Tab content */}
          <div className="p-3">
            {activeTab === 'overview' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-2 rounded-md ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className="text-xs font-mono uppercase text-gray-500">Market Cap</div>
                    <div className="font-bold">
                      {formatCurrency(tokenInfo.market?.marketCap)}
                    </div>
                  </div>
                  <div className={`p-2 rounded-md ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className="text-xs font-mono uppercase text-gray-500">24h Volume</div>
                    <div className="font-bold">
                      {formatCurrency(tokenInfo.market?.totalVolume)}
                    </div>
                  </div>
                  <div className={`p-2 rounded-md ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className="text-xs font-mono uppercase text-gray-500">Total Supply</div>
                    <div className="font-bold">
                      {tokenInfo.market?.totalSupply 
                        ? formatNumber(tokenInfo.market.totalSupply) 
                        : tokenInfo.onchain?.total_supply 
                          ? formatNumber(parseInt(tokenInfo.onchain.total_supply) / Math.pow(10, tokenInfo.onchain.decimals || 0))
                          : 'N/A'
                      }
                    </div>
                  </div>
                  <div className={`p-2 rounded-md ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className="text-xs font-mono uppercase text-gray-500">Circulating Supply</div>
                    <div className="font-bold">
                      {formatNumber(tokenInfo.market?.circulatingSupply)}
                    </div>
                  </div>
                </div>

                {tokenInfo.market?.description && (
                  <div className={`p-3 rounded-md ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} mt-3`}>
                    <div className="text-xs font-mono uppercase text-gray-500 mb-1">Description</div>
                    <div className="text-sm max-h-32 overflow-y-auto">
                      {tokenInfo.market.description.substring(0, 300)}
                      {tokenInfo.market.description.length > 300 ? '...' : ''}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'liquidity' && (
              <div>
                <div className="text-sm font-semibold mb-2">Liquidity Pools</div>
                <div className="overflow-x-auto">
                  <table className={`w-full text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <thead>
                      <tr className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} font-mono uppercase`}>
                        <th className="px-2 py-2 text-left">DEX</th>
                        <th className="px-2 py-2 text-left">Pair</th>
                        <th className="px-2 py-2 text-right">Price</th>
                        <th className="px-2 py-2 text-right">Liquidity</th>
                        <th className="px-2 py-2 text-right">24h Volume</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {tokenPools.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-2 py-4 text-center">
                            No liquidity pools found
                          </td>
                        </tr>
                      ) : (
                        tokenPools.map((pool) => (
                          <tr key={pool.pairAddress} className={darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                            <td className="px-2 py-2 uppercase">{pool.dexId}</td>
                            <td className="px-2 py-2">
                              {pool.baseToken.symbol}/{pool.quoteToken.symbol}
                            </td>
                            <td className="px-2 py-2 text-right font-mono">
                              ${parseFloat(pool.priceUsd).toFixed(parseFloat(pool.priceUsd) < 0.01 ? 6 : 2)}
                            </td>
                            <td className="px-2 py-2 text-right font-mono">
                              ${formatNumber(pool.liquidity.usd)}
                            </td>
                            <td className="px-2 py-2 text-right font-mono">
                              ${formatNumber(pool.volume.h24 || 0)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'holders' && chainId === 'solana' && (
              <div>
                <div className="text-sm font-semibold mb-2">Top Holders</div>
                <div className="overflow-x-auto">
                  <table className={`w-full text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <thead>
                      <tr className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} font-mono uppercase`}>
                        <th className="px-2 py-2 text-left">Wallet</th>
                        <th className="px-2 py-2 text-right">Amount</th>
                        <th className="px-2 py-2 text-right">Percentage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {topHolders.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-2 py-4 text-center">
                            No holder data available
                          </td>
                        </tr>
                      ) : (
                        topHolders.map((holder, index) => (
                          <tr key={index} className={darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                            <td className="px-2 py-2 font-mono">{truncateAddress(holder.owner)}</td>
                            <td className="px-2 py-2 text-right font-mono">
                              {formatNumber(holder.amount, 0)}
                            </td>
                            <td className="px-2 py-2 text-right font-mono">
                              {holder.percentage.toFixed(2)}%
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'info' && (
              <div className="space-y-3">
                {/* Links */}
                <div className="mb-4">
                  <div className="text-sm font-semibold mb-2">Links</div>
                  <div className="flex flex-wrap gap-2">
                    {tokenInfo.market?.homePage && (
                      <a 
                        href={tokenInfo.market.homePage} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`px-3 py-1 text-xs rounded-full flex items-center ${
                          darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                      >
                        <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke="currentColor" strokeWidth="2" />
                          <path d="M12 8L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <path d="M8 12L16 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Website
                      </a>
                    )}
                    
                    {tokenInfo.market?.twitter && (
                      <a 
                        href={`https://twitter.com/${tokenInfo.market.twitter}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`px-3 py-1 text-xs rounded-full flex items-center ${
                          darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                      >
                        <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22 4.01C21 4.5 20.02 4.69 19 5C17.879 3.735 16.217 3.665 14.62 4.263C13.023 4.861 11.977 6.055 12 7.5V8.5C8.755 8.598 5.865 7.246 4 5C4 5 -0.182 12.433 8 16C6.128 17.247 4.261 18.088 2 18C5.308 19.803 8.913 20.423 12.034 19.517C15.614 18.477 18.556 15.794 19.685 11.775C20.0218 10.4174 20.1129 9.01544 19.954 7.633C19.908 7.266 21.692 5.132 22 4.009L22 4.01Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Twitter
                      </a>
                    )}
                    
                    <a 
                      href={`https://solscan.io/token/${tokenAddress}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`px-3 py-1 text-xs rounded-full flex items-center ${
                        darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 10L12 5L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 5V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M19 14L19 19L5 19L5 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Explorer
                    </a>
                  </div>
                </div>
                
                {/* Technical details */}
                <div>
                  <div className="text-sm font-semibold mb-2">Token Details</div>
                  <div className={`rounded-md overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className="grid grid-cols-2 text-xs">
                      <div className="px-2 py-1 border-b border-r border-gray-700">
                        <span className="text-gray-500">Token Name:</span> {tokenInfo.onchain?.name || tokenInfo.market?.name || 'N/A'}
                      </div>
                      <div className="px-2 py-1 border-b border-gray-700">
                        <span className="text-gray-500">Symbol:</span> {tokenInfo.onchain?.symbol || tokenInfo.market?.symbol || 'N/A'}
                      </div>
                      <div className="px-2 py-1 border-b border-r border-gray-700">
                        <span className="text-gray-500">Decimals:</span> {tokenInfo.onchain?.decimals || 'N/A'}
                      </div>
                      <div className="px-2 py-1 border-b border-gray-700">
                        <span className="text-gray-500">Network:</span> {chainId.toUpperCase()}
                      </div>
                      <div className="px-2 py-1 border-r border-gray-700">
                        <span className="text-gray-500">Contract:</span>
                        <div className="font-mono truncate max-w-[120px]">{tokenAddress}</div>
                      </div>
                      <div className="px-2 py-1">
                        <span className="text-gray-500">Last Updated:</span> {tokenInfo.market?.lastUpdated ? new Date(tokenInfo.market.lastUpdated).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="p-4 text-center">
          <div className="font-semibold mb-2">No token selected</div>
          <div className="text-sm text-gray-500">Select a token from the table to view details</div>
        </div>
      )}
    </div>
  );
} 