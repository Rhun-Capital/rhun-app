import React, { useState, useRef, useEffect } from 'react';
import type { ToolInvocation as AIToolInvocation } from '@ai-sdk/ui-utils';
import LoadingIndicator from '../loading-indicator';

// Updated token interface based on the actual data structure
interface DexScreenerToken {
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
    fullyDilutedValuation?: number;
    volume24h?: number;
    liquidity?: number;
    totalPairs?: number;
    buys24h?: number;
    sells24h?: number;
    totalTransactions24h?: number;
    buySellRatio?: number;
  };
  links?: {
    total: number;
    socialLinks: string[];
    websiteUrls: string[];
    otherLinks: {
      url: string;
      description: string;
    }[];
  };
  details?: {
    createdAt?: string;
    ageDays?: number;
    labels?: string[];
    uniqueDexes?: string[];
  };
  last_updated: string;
  score: number;
  network?: string;
}

interface RecentDexScreenerProps {
  toolCallId: string;
  toolInvocation: AIToolInvocation & {
    result?: DexScreenerToken[];
  };
}

// Helper function to format large numbers
const formatNumber = (num: number | undefined): string => {
  if (num === undefined) return 'N/A';
  
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  } else if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  return num.toFixed(2);
};

// Safe array access helper
const safeArrayAccess = <T,>(arr: T[] | undefined | null): T[] => {
  return Array.isArray(arr) ? arr : [];
};

const RecentDexScreenerTokens: React.FC<RecentDexScreenerProps> = ({ toolInvocation }) => {
  const [selectedToken, setSelectedToken] = useState<DexScreenerToken | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  
  // Safely get the tokens array
  const tokens = Array.isArray(toolInvocation.result) ? toolInvocation.result : [];

  useEffect(() => {
    if (selectedToken && topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedToken, topRef]);

  console.log(toolInvocation.state)

  // if loading show loading state
  if (!tokens.length && toolInvocation.state === 'call') {
    return (
      <div className="p-4 text-center text-zinc-400">
        <LoadingIndicator/>
      </div>
    );
  }  

  // If no tokens, show empoty state
  if (!tokens.length && toolInvocation.state === 'result') {
    return (
      <div className="p-4 text-center text-zinc-400">
        No tokens found
      </div>
    );
  }

  // Token detail view
  if (selectedToken) {
    // Ensure we have a valid token (defensive coding)
    if (!selectedToken.tokenAddress) {
      return (
        <div className="p-4 text-center text-zinc-400">
          Invalid token data
        </div>
      );
    }

    return (
      <div className="bg-zinc-800 p-4 rounded-lg" ref={topRef}>
        <button 
          onClick={() => setSelectedToken(null)}
          className="mb-4 text-sm text-zinc-400 hover:text-white"
        >
          ← Back to list
        </button>

        <div className="flex items-center mb-4">
          <img 
            src={selectedToken.icon || '/api/placeholder/48/48'}
            alt={selectedToken.name || selectedToken.tokenAddress}
            className="w-12 h-12 rounded-full mr-4"
          />
          <div>
            <h2 className="text-xl font-bold text-white">
              {selectedToken.name || selectedToken.tokenAddress.substring(0, 10)}
              {selectedToken.symbol && ` (${selectedToken.symbol})`}
            </h2>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="bg-blue-900 text-blue-200 px-2 py-0.5 text-xs rounded">
                {selectedToken.chainId}
              </span>
              {selectedToken.details?.ageDays !== undefined && (
                <span className="bg-purple-900 text-purple-200 px-2 py-0.5 text-xs rounded">
                  {selectedToken.details.ageDays} days old
                </span>
              )}
              {safeArrayAccess(selectedToken.details?.labels).map(label => (
                <span key={label} className="bg-green-900 text-green-200 px-2 py-0.5 text-xs rounded">
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Key metrics section */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="bg-zinc-700 p-3 rounded-lg">
            <div className="text-xs text-zinc-400">Price</div>
            <div className="text-lg font-semibold text-white">
              {selectedToken.price?.formatted || (selectedToken.price?.value ? `$${selectedToken.price.value.toFixed(6)}` : 'N/A')}
            </div>
          </div>
          
          <div className="bg-zinc-700 p-3 rounded-lg">
            <div className="text-xs text-zinc-400">Market Cap</div>
            <div className="text-lg font-semibold text-white">
              {selectedToken.metrics?.marketCap ? `$${formatNumber(selectedToken.metrics.marketCap)}` : 'N/A'}
            </div>
          </div>
          
          <div className="bg-zinc-700 p-3 rounded-lg">
            <div className="text-xs text-zinc-400">24h Volume</div>
            <div className="text-lg font-semibold text-white">
              {selectedToken.metrics?.volume24h ? `$${formatNumber(selectedToken.metrics.volume24h)}` : 'N/A'}
            </div>
          </div>
          
          <div className="bg-zinc-700 p-3 rounded-lg">
            <div className="text-xs text-zinc-400">Liquidity</div>
            <div className="text-lg font-semibold text-white">
              {selectedToken.metrics?.liquidity ? `$${formatNumber(selectedToken.metrics.liquidity)}` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Transaction metrics */}
        {(selectedToken.metrics?.buys24h !== undefined || selectedToken.metrics?.sells24h !== undefined) && (
          <div className="bg-zinc-700 p-3 rounded-lg mb-4">
            <h3 className="text-sm font-medium text-zinc-300 mb-2">Transaction Activity (24h)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-zinc-400">Buys</div>
                <div className="text-lg font-semibold text-green-400">
                  {selectedToken.metrics?.buys24h?.toLocaleString() || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">Sells</div>
                <div className="text-lg font-semibold text-red-400">
                  {selectedToken.metrics?.sells24h?.toLocaleString() || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">Buy/Sell Ratio</div>
                <div className="text-lg font-semibold text-white">
                  {selectedToken.metrics?.buySellRatio?.toFixed(2) || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {/* Description - only show if exists */}
          {selectedToken.description && (
            <div className="bg-zinc-900 p-3 rounded-lg">
              <div className="text-sm text-zinc-500 mb-2">Description</div>
              <p className="text-sm text-zinc-300">{selectedToken.description}</p>
            </div>
          )}

          {/* Token Address */}
          <div className="bg-zinc-900 p-3 rounded-lg">
            <div className="text-sm text-zinc-500">Token Address</div>
            <div className="text-sm break-all">{selectedToken.tokenAddress}</div>
          </div>

          {/* Trading Information */}
          <div className="bg-zinc-900 p-3 rounded-lg">
            <div className="text-sm text-zinc-500 mb-2">Trading Information</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-zinc-400">Trading Pairs:</span>
                <span className="text-sm text-zinc-300 ml-2">{selectedToken.metrics?.totalPairs || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-xs text-zinc-400">DEXes:</span>
                <span className="text-sm text-zinc-300 ml-2">
                  {safeArrayAccess(selectedToken.details?.uniqueDexes).length || 'Unknown'}
                </span>
              </div>
              {selectedToken.details?.createdAt && (
                <div>
                  <span className="text-xs text-zinc-400">Listed on:</span>
                  <span className="text-sm text-zinc-300 ml-2">
                    {new Date(selectedToken.details.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* DEX List - only show if exists and has length */}
          {safeArrayAccess(selectedToken.details?.uniqueDexes).length > 0 && (
            <div className="bg-zinc-900 p-3 rounded-lg">
              <div className="text-sm text-zinc-500 mb-2">Available on</div>
              <div className="flex flex-wrap gap-2">
                {safeArrayAccess(selectedToken.details?.uniqueDexes).map(dex => (
                  <span key={dex} className="bg-zinc-700 text-zinc-300 px-2 py-1 text-xs rounded">
                    {dex}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Social Links - only show if exists and has length */}
          {safeArrayAccess(selectedToken.links?.socialLinks).length > 0 && (
            <div className="bg-zinc-900 p-3 rounded-lg">
              <div className="text-sm text-zinc-500 mb-2">Social Media</div>
              <ul className="space-y-1">
                {safeArrayAccess(selectedToken.links?.socialLinks).map(social => (
                  <li key={social} className="text-sm text-zinc-300">
                    <a 
                      href={social}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      {social}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Website Links - only show if exists and has length */}
          {safeArrayAccess(selectedToken.links?.websiteUrls).length > 0 && (
            <div className="bg-zinc-900 p-3 rounded-lg">
              <div className="text-sm text-zinc-500 mb-2">Websites</div>
              <ul className="space-y-1">
                {safeArrayAccess(selectedToken.links?.websiteUrls).map(url => (
                  <li key={url}>
                    <a 
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300 truncate block"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Other Links - only show if exists and has length */}
          {safeArrayAccess(selectedToken.links?.otherLinks).length > 0 && (
            <div className="bg-zinc-900 p-3 rounded-lg">
              <div className="text-sm text-zinc-500 mb-2">Other Links</div>
              <ul className="space-y-1">
                {safeArrayAccess(selectedToken.links?.otherLinks).map(link => (
                  <li key={link.url}>
                    <a 
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300 truncate block"
                    >
                      {link.description !== 'Link' ? `${link.description}: ${link.url}` : link.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* DexScreener Link - only show if exists */}
          {selectedToken.url && (
            <div className="bg-zinc-900 p-3 rounded-lg">
              <a 
                href={selectedToken.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 flex items-center justify-center py-2"
              >
                View on DexScreener
              </a>
            </div>
          )}

          {/* Last Updated */}
          <div className="text-xs text-zinc-500 text-center mt-4">
            Last updated: {selectedToken.last_updated ? new Date(selectedToken.last_updated).toLocaleString() : 'Unknown'}
          </div>
        </div>
      </div>
    );
  }

  // Token list view
  return (
    <div className="bg-zinc-800 rounded-lg">
      <div className="p-4">
        <h2 className="text-xl font-bold text-white mb-2">Recent Tokens</h2>
        <p className="text-zinc-400 mb-4">DexScreener Token List</p>

        <div className="space-y-3">
          {tokens.map((token: DexScreenerToken) => {
            // Skip tokens without required fields
            if (!token || !token.tokenAddress) return null;
            
            return (
              <div 
                key={token.tokenAddress}
                onClick={() => setSelectedToken(token)}
                className="bg-zinc-900 p-3 rounded-lg flex items-center hover:bg-zinc-700 cursor-pointer transition-colors"
              >
                <img 
                  src={token.icon || '/api/placeholder/32/32'}
                  alt={token.name || token.tokenAddress.substring(0, 8)}
                  className="w-10 h-10 rounded-full mr-3"
                />
                <div className="flex-grow">
                  <div className="font-medium text-white">
                    {token.name || token.tokenAddress.substring(0, 8)}
                    {token.symbol && ` (${token.symbol})`}
                  </div>
                  <div className="text-sm text-zinc-400 flex flex-wrap gap-x-2">
                    <span>{token.chainId}</span>
                    {token.price?.value !== undefined && (
                      <span className="text-green-400">
                        ${token.price.formatted || token.price.value.toFixed(6)}
                      </span>
                    )}
                    {token.details?.ageDays !== undefined && (
                      <span>{token.details.ageDays}d old</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {token.metrics?.marketCap !== undefined && (
                    <div className="text-sm font-medium text-white">
                      ${formatNumber(token.metrics.marketCap)}
                    </div>
                  )}
                  <div className="flex items-center text-xs text-zinc-500">
                    <span className="mr-2">
                      {token.metrics?.totalTransactions24h ? `${token.metrics.totalTransactions24h} txns` : ''}
                    </span>
                    <span>
                      {token.links?.total !== undefined ? `${token.links.total} links` : ''}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RecentDexScreenerTokens;