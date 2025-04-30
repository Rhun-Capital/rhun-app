'use client';

import { useState, useEffect } from 'react';
import { 
  getLatestTokenProfiles,
  getTopBoostedTokens,
  getLatestBoostedTokens,
  getTokenOrders,
  getPairsByTokenAddresses,
  transformPairsToTokens,
  DexScreenerToken,
  DexScreenerTokenProfile,
  DexScreenerTokenBoost,
  DexScreenerOrderStatus
} from '@/utils/dexscreener';

// Simple enhanced token interface
interface EnhancedToken {
  tokenAddress: string;
  chainId: string;
  name?: string;
  symbol?: string;
  url?: string;
  description?: string;
  icon?: string;
  price?: {
    value: number;
    formatted: string;
  };
  metrics?: {
    marketCap?: number;
    volume24h?: number;
    liquidity?: number;
    totalTransactions24h?: number;
    buySellRatio?: number;
  };
  ordersCount?: number;
  boostAmount?: number;
  score: number;
}

interface TokenTableProps {
  chainId: string;
  listType: string;
  onSelectToken: (tokenAddress: string, tokenData?: any) => void;
  selectedToken: string | null;
}

// Helper function to get display name for the current list type
function getListTypeDisplayName(listType: string): string {
  const displayNames: {[key: string]: string} = {
    'trending': 'Trending Tokens',
    'newest': 'Newest Tokens',
    'gainers': 'Top Gainers',
    'volume': 'Highest Volume',
    'liquidity': 'Highest Liquidity'
  };
  return displayNames[listType] || 'Trending Tokens';
}

// Convert token profile to an enhanced token format
function convertProfileToToken(profile: DexScreenerTokenProfile | DexScreenerTokenBoost): EnhancedToken {
  // Extract symbol from URL or use a default
  const urlParts = profile.url.split('/');
  const symbol = urlParts[urlParts.length - 1].toUpperCase();
  
  // Check if token has boost info
  const boostAmount = 'amount' in profile ? profile.amount : undefined;
  
  return {
    tokenAddress: profile.tokenAddress,
    chainId: profile.chainId,
    name: symbol, // Use the symbol as name too since we don't have a name
    symbol: symbol,
    url: profile.url,
    description: profile.description,
    icon: profile.icon,
    boostAmount: boostAmount,
    price: {
      value: 0, // We don't have price data in profile
      formatted: 'N/A'
    },
    metrics: {
      marketCap: 0,
      volume24h: 0,
      liquidity: 0,
      totalTransactions24h: 0,
      buySellRatio: 0
    },
    score: 50 // Default score
  };
}

export default function TokenTable({ chainId, listType, onSelectToken, selectedToken }: TokenTableProps) {
  const [tokens, setTokens] = useState<EnhancedToken[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [allTokens, setAllTokens] = useState<EnhancedToken[]>([]);

  // Fetch tokens based on list type
  useEffect(() => {
    const fetchTokensByListType = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let tokenData: EnhancedToken[] = [];
        
        // Choose data source based on listType
        switch(listType) {
          case 'trending':
            // Get trending tokens from getTopBoostedTokens
            const trendingTokens = await getTopBoostedTokens();
            tokenData = trendingTokens.map(token => convertProfileToToken(token));
            
            // Set sort field to boost amount for trending
            setSortField('boostAmount');
            setSortDirection('desc');
            break;
            
          case 'newest':
            // Get newest tokens from getLatestBoostedTokens
            const newestTokens = await getLatestBoostedTokens();
            tokenData = newestTokens.map(token => convertProfileToToken(token));
            break;
            
          default:
            // Fallback to getLatestTokenProfiles for other tabs
            const profiles = await getLatestTokenProfiles();
            tokenData = profiles.map(token => convertProfileToToken(token));
        }
        
        // Filter by chain if specified
        if (chainId) {
          tokenData = tokenData.filter(token => 
            token.chainId.toLowerCase() === chainId.toLowerCase()
          );
        }
        
        // Try to get additional token information
        if (tokenData.length > 0) {
          // Get token pricing and additional details by using the token addresses
          const tokenAddresses = tokenData.map(token => token.tokenAddress).join(',');
          try {
            const pairs = await getPairsByTokenAddresses(chainId, tokenAddresses);
            if (pairs && pairs.length > 0) {
              const enrichedTokens = transformPairsToTokens(pairs);
              
              // Merge the enriched data back to our tokens
              tokenData = tokenData.map(token => {
                const enriched = enrichedTokens.find(et => et.tokenAddress === token.tokenAddress);
                if (enriched) {
                  return {
                    ...token,
                    price: enriched.price,
                    metrics: enriched.metrics,
                    score: enriched.score
                  };
                }
                return token;
              });
            }
          } catch (error) {
            console.warn('Error fetching additional token data:', error);
            // Continue with basic token data if this fails
          }
          
          // For the first few tokens, try to get order information
          const orderPromises = tokenData.slice(0, 5).map(async (token) => {
            try {
              const orders = await getTokenOrders(token.chainId, token.tokenAddress);
              return {
                tokenAddress: token.tokenAddress,
                ordersCount: orders.length
              };
            } catch (error) {
              console.warn(`Error fetching orders for ${token.tokenAddress}:`, error);
              return {
                tokenAddress: token.tokenAddress,
                ordersCount: 0
              };
            }
          });
          
          const orderResults = await Promise.all(orderPromises);
          
          // Add order information to tokens
          tokenData = tokenData.map(token => {
            const orderInfo = orderResults.find(o => o.tokenAddress === token.tokenAddress);
            if (orderInfo) {
              return {
                ...token,
                ordersCount: orderInfo.ordersCount
              };
            }
            return token;
          });
        }
        
        // Set tokens state
        setAllTokens(tokenData);
        setTokens(tokenData);
        
        if (tokenData.length === 0) {
          setError('No tokens found for the selected tab and chain. Try another tab.');
        }
      } catch (error) {
        console.error('Error fetching tokens:', error);
        setError('Failed to fetch token data. Please check console for details.');
      } finally {
        setLoading(false);
      }
    };

    fetchTokensByListType();
  }, [chainId, listType]);

  // Apply search filter separately
  useEffect(() => {
    if (allTokens.length === 0) return;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filteredTokens = allTokens.filter(token => 
        token.symbol?.toLowerCase().includes(query) || 
        token.name?.toLowerCase().includes(query) ||
        token.description?.toLowerCase().includes(query)
      );
      setTokens(filteredTokens);
    } else {
      // If no search query, show all tokens
      setTokens(allTokens);
    }
  }, [searchQuery, allTokens]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending for most fields
      setSortField(field);
      setSortDirection(field === 'name' || field === 'symbol' ? 'asc' : 'desc');
    }
  };

  const sortedTokens = [...tokens].sort((a, b) => {
    let aValue: string | number = '';
    let bValue: string | number = '';
    
    switch (sortField) {
      case 'name':
        aValue = a.name || '';
        bValue = b.name || '';
        break;
      case 'symbol':
        aValue = a.symbol || '';
        bValue = b.symbol || '';
        break;
      case 'price':
        aValue = a.price?.value || 0;
        bValue = b.price?.value || 0;
        break;
      case 'boostAmount':
        aValue = a.boostAmount || 0;
        bValue = b.boostAmount || 0;
        break;
      case 'ordersCount':
        aValue = a.ordersCount || 0;
        bValue = b.ordersCount || 0;
        break;
      case 'score':
      default:
        aValue = a.score || 0;
        bValue = b.score || 0;
    }
    
    // Compare based on sort direction
    let compareResult: number;
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      compareResult = aValue.localeCompare(bValue);
    } else {
      // Convert to numbers for numerical comparison
      compareResult = Number(aValue) - Number(bValue);
    }
    
    return sortDirection === 'asc' ? compareResult : -compareResult;
  });

  // Format currency values
  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  // Get display name for the current list type
  const getListTypeDisplay = () => {
    return getListTypeDisplayName(listType);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-200">
          {getListTypeDisplay()}
        </h2>
        
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Search tokens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm py-1 px-2 rounded-md bg-zinc-700 bg-opacity-40 border border-zinc-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-200"
          />
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-zinc-300">
          <thead>
            <tr className="bg-zinc-800 uppercase">
              <th className="px-2 py-2 text-left cursor-pointer" onClick={() => handleSort('name')}>
                <div className="flex items-center">
                  <span>Token</span>
                  {sortField === 'name' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-2 py-2 text-left">Chain</th>
              <th className="px-2 py-2 text-left cursor-pointer" onClick={() => handleSort('boostAmount')}>
                <div className="flex items-center">
                  <span>Boost</span>
                  {sortField === 'boostAmount' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-2 py-2 text-left cursor-pointer" onClick={() => handleSort('ordersCount')}>
                <div className="flex items-center">
                  <span>Orders</span>
                  {sortField === 'ordersCount' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-2 py-2 text-left">Description</th>
              <th className="px-2 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-2 py-4 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-2 py-4 text-center text-yellow-500">
                  {error}
                </td>
              </tr>
            ) : sortedTokens.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-4 text-center">
                  No tokens found matching your criteria
                </td>
              </tr>
            ) : (
              sortedTokens.map((token) => (
                <tr 
                  key={`${token.chainId}:${token.tokenAddress}`}
                  onClick={() => onSelectToken(token.tokenAddress, token)}
                  className={`
                    hover:bg-zinc-800
                    ${selectedToken === token.tokenAddress ? 'bg-indigo-900 bg-opacity-30' : ''}
                    cursor-pointer
                  `}
                >
                  <td className="px-2 py-2">
                    <div className="flex items-center">
                      {token.icon ? (
                        <img src={token.icon} alt={token.symbol} className="w-8 h-8 rounded-full mr-2" />
                      ) : (
                        <div className="w-8 h-8 rounded-full mr-2 flex items-center justify-center font-semibold bg-zinc-700">
                          {token.symbol?.charAt(0) || '?'}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold">{token.symbol}</div>
                        <div className="text-xs text-zinc-500 truncate max-w-[120px]">{token.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2">{token.chainId}</td>
                  <td className="px-2 py-2">
                    {token.boostAmount ? 
                      <span className="text-emerald-400">{token.boostAmount}</span> : 
                      <span className="text-zinc-500">-</span>
                    }
                  </td>
                  <td className="px-2 py-2">
                    {token.ordersCount !== undefined ? 
                      <span className={token.ordersCount > 0 ? "text-emerald-400" : "text-zinc-500"}>
                        {token.ordersCount}
                      </span> : 
                      <span className="text-zinc-500">-</span>
                    }
                  </td>
                  <td className="px-2 py-2">
                    <div className="truncate max-w-[200px] text-xs text-zinc-400">
                      {token.description || 'No description available'}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <a 
                      href={token.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 