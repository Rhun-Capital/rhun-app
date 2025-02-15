import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import type { ToolInvocation as AIToolInvocation } from '@ai-sdk/ui-utils';
import CopyButton from '@/components/copy-button';

interface SolanaToken {
  address: string;
  name: string;
  symbol: string;
  icon?: string;
  price?: number;
  holder?: number;
  volume_24h?: number;
  market_cap?: number;
  market_cap_rank?: number;
  price_change_24h?: number;
  description?: string;
  twitter?: string;
  website?: string;
  supply?: string;
  last_updated: string;
}

interface TrendingSolanaProps {
  toolCallId: string;
  toolInvocation: AIToolInvocation & {
    result?: SolanaToken[];
  };
}

interface SortableColumn {
  key: keyof SolanaToken;
  label: string;
  sortable: boolean;
}

const TrendingSolana: React.FC<TrendingSolanaProps> = ({ toolCallId, toolInvocation }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedToken, setSelectedToken] = useState<SolanaToken | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof SolanaToken; direction: 'asc' | 'desc' }>({
    key: 'market_cap_rank',
    direction: 'asc'
  });

  const columns: SortableColumn[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'price', label: 'Price', sortable: true },
    { key: 'price_change_24h', label: '24h Change', sortable: true },
    { key: 'holder', label: 'Holders', sortable: true },
    { key: 'market_cap', label: 'Market Cap', sortable: true },
    { key: 'volume_24h', label: 'Volume (24h)', sortable: true },
  ];

  const tokens = toolInvocation.result || [];
  const pageSize = 5;

  const formatUsdPrice = (price?: number) => {
    if (typeof price === 'number') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
      }).format(price);
    }
    return 'N/A';
  };

  const formatPercentage = (value?: number) => {
    if (typeof value === 'number') {
      return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
    }
    return 'N/A';
  };

  const formatNumber = (value?: number) => {
    if (typeof value === 'number') {
      return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1
      }).format(value);
    }
    return 'N/A';
  };

  const handleSort = (key: keyof SolanaToken) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortedTokens = (tokensToSort: SolanaToken[]) => {
    if (!tokensToSort || !Array.isArray(tokensToSort)) {
      return [];
    }
  
    return [...tokensToSort].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
  
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });
  };

  const sortedTokens = getSortedTokens(tokens);
  const currentTokens = sortedTokens.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  const SortButton = ({ column }: { column: SortableColumn }) => {
    if (!column.sortable) return null;

    return (
      <button 
        onClick={() => handleSort(column.key)} 
        className="flex items-center justify-end gap-1 ml-auto hover:text-white transition-colors w-full"
      >
        <span>{column.label}</span>
        {sortConfig.key === column.key && (
          sortConfig.direction === 'asc' ? 
            <ChevronUp className="w-4 h-4"/> : 
            <ChevronDown className="w-4 h-4"/>
        )}
        {sortConfig.key !== column.key && (
          <ChevronDown className="w-4 h-4 opacity-30" />
        )}
      </button>
    );
  };

  const TokenCard = ({ token }: { token: SolanaToken }) => (
    <div 
      onClick={() => setSelectedToken(token)}
      className="bg-zinc-900 p-4 rounded-lg hover:bg-zinc-700/50 cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-3 mb-3">
        <img 
          src={token.icon || '/api/placeholder/32/32'}
          alt={token.name}
          className="w-8 h-8 rounded-full"
        />
        <div>
          <div className="font-medium text-white">{token.name}</div>
          <div className="text-sm text-zinc-400">{token.symbol.toUpperCase()}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <div className="text-zinc-400">Price</div>
          <div className="text-white font-medium">{formatUsdPrice(token.price)}</div>
        </div>
        <div>
          <div className="text-zinc-400">24h Change</div>
          <div className={`font-medium ${token.price_change_24h && token.price_change_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatPercentage(token.price_change_24h)}
          </div>
        </div>
        <div>
          <div className="text-zinc-400">Market Cap</div>
          <div className="text-white font-medium">{formatNumber(token.market_cap)}</div>
        </div>
        <div>
          <div className="text-zinc-400">Holders</div>
          <div className="text-white font-medium">{formatNumber(token.holder)}</div>
        </div>
      </div>
    </div>
  );

  if (selectedToken) {
    return (
      <div className="w-full bg-zinc-800 rounded-lg overflow-hidden">
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <button 
            onClick={() => setSelectedToken(null)}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to list
          </button>
  
          {/* Header with Token Info */}
          <div className="flex items-center gap-4">
            <img 
              src={selectedToken.icon || '/api/placeholder/48/48'}
              alt={selectedToken.name}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full"
            />
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">{selectedToken.name}</h2>
              <div className="flex items-center gap-2">
                <p className="text-zinc-400">{selectedToken.symbol.toUpperCase()}</p>
              </div>
            </div>
          </div>
  
          {/* Primary Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
              <div className="text-sm text-zinc-500">Price</div>
              <div className="text-base sm:text-lg font-semibold text-white">
                {formatUsdPrice(selectedToken.price)}
              </div>
            </div>
            <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
              <div className="text-sm text-zinc-500">Market Cap</div>
              <div className="text-base sm:text-lg font-semibold text-white">
                {formatUsdPrice(selectedToken.market_cap)}
              </div>
            </div>
            <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
              <div className="text-sm text-zinc-500">Holders</div>
              <div className="text-base sm:text-lg font-semibold text-white">
                {formatNumber(selectedToken.holder)}
              </div>
            </div>
          </div>
  
          {/* Token Details */}
          <div className="space-y-3">
            <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
              <div className="text-sm text-zinc-500 mb-2">Token Address</div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-mono p-2 rounded break-all">
                  {selectedToken.address}
                </div>
                <CopyButton text={selectedToken.address} />
              </div>
            </div>
  
            {/* Social Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedToken.website && (
                <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
                  <div className="text-sm text-zinc-500">Website</div>
                  <a 
                    href={selectedToken.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors truncate block"
                  >
                    {new URL(selectedToken.website).hostname}
                  </a>
                </div>
              )}
              {selectedToken.twitter && (
                <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
                  <div className="text-sm text-zinc-500">Twitter</div>
                  <a 
                    href={selectedToken.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors truncate block"
                  >
                    {new URL(selectedToken.twitter).hostname}
                  </a>
                </div>
              )}
            </div>
          </div>
  
          {/* Description */}
          {selectedToken.description && (
            <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg space-y-2">
              <h3 className="text-base font-semibold text-white">About</h3>
              <p className="text-sm text-zinc-400">{selectedToken.description}</p>
            </div>
          )}
  
          {/* Additional Info */}
          <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
            <div className="text-sm text-zinc-500">Last Updated</div>
            <div className="text-sm text-zinc-400">
              {new Date(selectedToken.last_updated).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!toolInvocation.result) {
    return (
      <div className="w-full bg-zinc-800 rounded-lg overflow-hidden">
        <div className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">
            Loading trending Solana tokens...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-zinc-800 rounded-lg overflow-hidden">
      <div className="p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-white">Trending Solana Tokens</h2>
        <p className="mb-4 sm:mb-6 text-sm text-zinc-500">Top trending coins on SolScan</p>
        
        <div className="lg:hidden space-y-3">
          {currentTokens.map((token) => (
            <TokenCard key={token.address} token={token} />
          ))}
        </div>

        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-zinc-400">
                {columns.map((column) => (
                  <th 
                    key={column.key}
                    className={`p-4 ${column.key === 'name' ? 'text-left' : 'text-right'}`}
                  >
                    {column.sortable ? (
                      <SortButton column={column} />
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentTokens.map((token) => (
                <tr 
                  key={token.address}
                  onClick={() => setSelectedToken(token)}
                  className="border-t border-zinc-700 hover:bg-zinc-700/50 cursor-pointer transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={token.icon || '/api/placeholder/32/32'}
                        alt={token.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <div className="font-medium text-white">{token.name}</div>
                        <div className="text-sm text-zinc-400">{token.symbol.toUpperCase()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right text-white">
                    {formatUsdPrice(token.price)}
                  </td>
                  <td className={`p-4 text-right ${token.price_change_24h && token.price_change_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatPercentage(token.price_change_24h)}
                  </td>
                  <td className="p-4 text-right text-white">
                    {formatNumber(token.holder)}
                  </td>
                  <td className="p-4 text-right text-white">
                    {formatNumber(token.market_cap)}
                  </td>
                  <td className="p-4 text-right text-white">
                    {formatNumber(token.volume_24h)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tokens.length > pageSize && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 px-2 sm:px-4">
            <div className="text-sm text-zinc-400 order-2 sm:order-1">
              Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, tokens.length)} of {tokens.length}
            </div>
            <div className="flex gap-2 order-1 sm:order-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="p-2 rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(Math.floor(tokens.length / pageSize), p + 1))}
                disabled={currentPage >= Math.floor(tokens.length / pageSize)}
                className="p-2 rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendingSolana;