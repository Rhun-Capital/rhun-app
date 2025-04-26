import React, { useState, useRef, useEffect } from 'react';
import type { ToolInvocation as AIToolInvocation } from '@ai-sdk/ui-utils';
import LoadingIndicator from '../loading-indicator';

// Updated interfaces based on the actual data structure
interface DexScreenerToken {
  address: string;
  name: string;
  symbol: string;
}

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: DexScreenerToken;
  quoteToken: DexScreenerToken;
  priceNative: string;
  priceUsd: string;
  txns: {
    m5?: { buys: number; sells: number };
    h1?: { buys: number; sells: number };
    h6?: { buys: number; sells: number };
    h24?: { buys: number; sells: number };
  };
  volume: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  priceChange: {
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: {
    imageUrl?: string;
    header?: string;
    openGraph?: string;
    websites?: { url: string }[];
    socials?: { platform: string; handle: string }[];
  };
}

interface RecentDexScreenerProps {
  toolCallId: string;
  toolInvocation: AIToolInvocation & {
    result?: DexScreenerPair[];
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

const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

// Calculate buy/sell ratio
const calculateBuySellRatio = (txns: DexScreenerPair['txns']): number | undefined => {
  const h24 = txns.h24;
  if (h24 && h24.sells > 0) {
    return h24.buys / h24.sells;
  }
  return undefined;
};

const RecentDexScreenerTokens: React.FC<RecentDexScreenerProps> = ({ toolInvocation }) => {
  const [selectedPair, setSelectedPair] = useState<DexScreenerPair | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  
  // Safely get the pairs array
  const pairs = Array.isArray(toolInvocation.result) ? toolInvocation.result : [];

  useEffect(() => {
    if (selectedPair && topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedPair, topRef]);

  // if loading show loading state
  if (!pairs.length && toolInvocation.state === 'call') {
    return (
      <div className="p-4 text-center text-zinc-400">
        <LoadingIndicator/>
      </div>
    );
  }  

  // If no pairs, show empty state
  if (!pairs.length && toolInvocation.state === 'result') {
    return (
      <div className="p-4 text-center text-zinc-400">
        No pairs found
      </div>
    );
  }

  // Pair detail view
  if (selectedPair) {
    // Ensure we have a valid pair (defensive coding)
    if (!selectedPair.pairAddress) {
      return (
        <div className="p-4 text-center text-zinc-400">
          Invalid pair data
        </div>
      );
    }

    const { baseToken } = selectedPair;

    return (
      <div className="bg-zinc-800 p-4 rounded-lg" ref={topRef}>
        <button 
          onClick={() => setSelectedPair(null)}
          className="mb-4 text-sm text-zinc-400 hover:text-white"
        >
          ← Back to list
        </button>

        <div className="flex items-center mb-4">
          <img 
            src={selectedPair.info?.imageUrl || '/api/placeholder/48/48'}
            alt={baseToken.name || baseToken.address}
            className="w-12 h-12 rounded-full mr-4"
          />
          <div>
            <h2 className="text-xl font-bold text-white">
              {baseToken.name || baseToken.address.substring(0, 10)}
              {baseToken.symbol && ` (${baseToken.symbol})`}
            </h2>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="bg-blue-900 text-blue-200 px-2 py-0.5 text-xs rounded">
                {selectedPair.chainId}
              </span>
              <span className="bg-purple-900 text-purple-200 px-2 py-0.5 text-xs rounded">
                {selectedPair.dexId}
              </span>
              {selectedPair.pairCreatedAt && (
                <span className="text-xs text-zinc-500">
                  Created {formatTimeAgo(selectedPair.pairCreatedAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Key metrics section */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="bg-zinc-700 p-3 rounded-lg">
            <div className="text-xs text-zinc-400">Price</div>
            <div className="text-lg font-semibold text-white">
              ${parseFloat(selectedPair.priceUsd || '0').toFixed(parseFloat(selectedPair.priceUsd || '0') < 0.01 ? 8 : 4)}
            </div>        
          </div>
          
          <div className="bg-zinc-700 p-3 rounded-lg">
            <div className="text-xs text-zinc-400">Market Cap</div>
            <div className="text-lg font-semibold text-white">
              {selectedPair.marketCap ? `$${formatNumber(selectedPair.marketCap)}` : 'N/A'}
            </div>
          </div>
          
          <div className="bg-zinc-700 p-3 rounded-lg">
            <div className="text-xs text-zinc-400">24h Volume</div>
            <div className="text-lg font-semibold text-white">
              {selectedPair.volume?.h24 ? `$${formatNumber(selectedPair.volume.h24)}` : 'N/A'}
            </div>
          </div>
          
          <div className="bg-zinc-700 p-3 rounded-lg">
            <div className="text-xs text-zinc-400">Liquidity</div>
            <div className="text-lg font-semibold text-white">
              {selectedPair.liquidity?.usd ? `$${formatNumber(selectedPair.liquidity.usd)}` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Transaction metrics */}
        {selectedPair.txns?.h24 && (
          <div className="bg-zinc-700 p-3 rounded-lg mb-4">
            <h3 className="text-sm font-medium text-zinc-300 mb-2">Transaction Activity (24h)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-zinc-400">Buys</div>
                <div className="text-lg font-semibold text-green-400">
                  {selectedPair.txns.h24.buys?.toLocaleString() || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">Sells</div>
                <div className="text-lg font-semibold text-red-400">
                  {selectedPair.txns.h24.sells?.toLocaleString() || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">Buy/Sell Ratio</div>
                <div className="text-lg font-semibold text-white">
                  {calculateBuySellRatio(selectedPair.txns)?.toFixed(2) || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {/* Price Change */}
          <div className="bg-zinc-900 p-3 rounded-lg">
            <div className="text-sm text-zinc-500 mb-2">Price Change</div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-zinc-400">1h</div>
                <div className={`text-sm font-semibold ${(selectedPair.priceChange?.h1 || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(selectedPair.priceChange?.h1 || 0) >= 0 ? '+' : ''}{(selectedPair.priceChange?.h1 || 0).toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">6h</div>
                <div className={`text-sm font-semibold ${(selectedPair.priceChange?.h6 || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(selectedPair.priceChange?.h6 || 0) >= 0 ? '+' : ''}{(selectedPair.priceChange?.h6 || 0).toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">24h</div>
                <div className={`text-sm font-semibold ${(selectedPair.priceChange?.h24 || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(selectedPair.priceChange?.h24 || 0) >= 0 ? '+' : ''}{(selectedPair.priceChange?.h24 || 0).toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          {/* Token Addresses */}
          <div className="bg-zinc-900 p-3 rounded-lg">
            <div className="text-sm text-zinc-500">Token Addresses</div>
            <div className="mt-2">
              <div className="text-xs text-zinc-400">Base Token ({baseToken.symbol})</div>
              <div className="text-sm break-all">{baseToken.address}</div>
            </div>
            <div className="mt-2">
              <div className="text-xs text-zinc-400">Quote Token ({selectedPair.quoteToken.symbol})</div>
              <div className="text-sm break-all">{selectedPair.quoteToken.address}</div>
            </div>
            <div className="mt-2">
              <div className="text-xs text-zinc-400">Pair Address</div>
              <div className="text-sm break-all">{selectedPair.pairAddress}</div>
            </div>
          </div>

          {/* Trading Information */}
          <div className="bg-zinc-900 p-3 rounded-lg">
            <div className="text-sm text-zinc-500 mb-2">Trading Information</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-zinc-400">DEX:</span>
                <span className="text-sm text-zinc-300 ml-2">{selectedPair.dexId}</span>
              </div>
              <div>
                <span className="text-xs text-zinc-400">Chain:</span>
                <span className="text-sm text-zinc-300 ml-2">{selectedPair.chainId}</span>
              </div>
              {selectedPair.pairCreatedAt && (
                <div>
                  <span className="text-xs text-zinc-400">Listed on:</span>
                  <span className="text-sm text-zinc-300 ml-2">
                    {new Date(selectedPair.pairCreatedAt).toLocaleDateString()} {new Date(selectedPair.pairCreatedAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
              <div>
                <span className="text-xs text-zinc-400">FDV:</span>
                <span className="text-sm text-zinc-300 ml-2">
                  ${selectedPair.fdv !== undefined ? formatNumber(selectedPair.fdv) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Social Links - only show if exists and has length */}
          {selectedPair.info?.socials && selectedPair.info.socials.length > 0 && (
            <div className="bg-zinc-900 p-3 rounded-lg">
              <div className="text-sm text-zinc-500 mb-2">Social Media</div>
              <ul className="space-y-1">
                {selectedPair.info.socials.map((social, index) => {
                  if (!social || !social.platform || !social.handle) return null;
                  
                  let url = '';
                  const platform = social.platform?.toLowerCase() || '';
                  
                  if (platform === 'twitter' || platform === 'x') {
                    url = `https://twitter.com/${social.handle}`;
                  } else if (platform === 'telegram') {
                    url = `https://t.me/${social.handle}`;
                  } else if (platform === 'discord') {
                    url = social.handle;
                  } else {
                    url = social.handle;
                  }
                  
                  return (
                    <li key={index} className="text-sm text-zinc-300">
                      <a 
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        {social.platform}: {social.handle}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Website Links - only show if exists and has length */}
          {selectedPair.info?.websites && selectedPair.info.websites.length > 0 && (
            <div className="bg-zinc-900 p-3 rounded-lg">
              <div className="text-sm text-zinc-500 mb-2">Websites</div>
              <ul className="space-y-1">
                {selectedPair.info.websites.map((website, index) => (
                  <li key={index}>
                    <a 
                      href={website.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300 truncate block"
                    >
                      {website.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* DexScreener Link */}
          <div className="bg-zinc-900 p-3 rounded-lg">
            <a 
              href={selectedPair.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 flex items-center justify-center py-2"
            >
              View on DexScreener
            </a>
          </div>

          {/* Last Updated */}
          <div className="text-xs text-zinc-500 text-center mt-4">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    );
  }

  // Token list view
  return (
    <div className="bg-zinc-800 rounded-lg">
      <div className="p-4">
        <h2 className="text-xl font-bold text-white mb-2">Active DexScreener Tokens</h2>
        <p className="text-zinc-400 mb-4">Recently launched and boosted tokens on DexScreener</p>

        <div className="space-y-3">
          {pairs.map((pair: DexScreenerPair) => {
            // Skip pairs without required fields
            if (!pair || !pair.pairAddress) return null;
            
            const { baseToken } = pair;
            const buySellRatio = calculateBuySellRatio(pair.txns);
            
            return (
              <div 
                key={pair.pairAddress}
                onClick={() => setSelectedPair(pair)}
                className="bg-zinc-900 p-3 rounded-lg flex items-center hover:bg-zinc-700 cursor-pointer transition-colors"
              >
                <img 
                  src={pair.info?.imageUrl || '/api/placeholder/32/32'}
                  alt={baseToken.name || baseToken.address.substring(0, 8)}
                  className="w-10 h-10 rounded-full mr-3"
                />
                <div className="flex-grow">
                  <div className="font-medium text-white">
                    {baseToken.name || baseToken.address.substring(0, 8)}
                    {baseToken.symbol && ` (${baseToken.symbol})`}
                  </div>
                  <div className="text-sm text-zinc-400 flex flex-wrap gap-x-2">
                    <span>{pair.chainId}</span>
                    <span className="text-green-400">
                      ${parseFloat(pair.priceUsd).toFixed(parseFloat(pair.priceUsd) < 0.01 ? 6 : 4)}
                    </span>
                    {pair.pairCreatedAt && (
                      <span>Created {formatTimeAgo(pair.pairCreatedAt)}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {pair.marketCap !== undefined && (
                    <div className="text-sm font-medium text-white">
                      ${formatNumber(pair.marketCap)}
                    </div>
                  )}
                  <div className="flex items-center text-xs text-zinc-500">
                    {pair.txns?.h24 && (
                      <span className="mr-2">
                        {(pair.txns.h24.buys || 0) + (pair.txns.h24.sells || 0)} txns
                      </span>
                    )}
                    <span className={`${(pair.priceChange?.h24 || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {(pair.priceChange?.h24 || 0) >= 0 ? '+' : ''}{(pair.priceChange?.h24 || 0).toFixed(2)}%
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