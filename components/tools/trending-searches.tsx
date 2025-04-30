import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import type { ToolInvocation as AIToolInvocation } from '@ai-sdk/ui-utils';

interface Coin {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  price_usd: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: string;
  sparkline?: string;
  content_description?: string;
}

interface TrendingCoinsProps {
  toolCallId: string;
  toolInvocation: AIToolInvocation & {
    result?: Coin[];
  };
}

interface SortableColumn {
    key: keyof Coin;
    label: string;
    sortable: boolean;
  }
  
  const TrendingCoins: React.FC<TrendingCoinsProps> = ({ toolCallId, toolInvocation }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Coin; direction: 'asc' | 'desc' }>({
      key: 'market_cap_rank',
      direction: 'asc'
    });
  
    const columns: SortableColumn[] = [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'price_usd', label: 'Price', sortable: true },
      { key: 'price_change_percentage_24h', label: '24h Change', sortable: true },
      { key: 'market_cap_rank', label: 'Rank', sortable: true },
      { key: 'market_cap', label: 'Market Cap', sortable: true },
      { key: 'total_volume', label: 'Volume (24h)', sortable: true },
      { key: 'sparkline', label: 'Chart', sortable: false },
    ];
  
    const coins = toolInvocation.result || [];
    const pageSize = 5;
  
    const formatUsdPrice = (price: number) => {
      if (typeof price === 'number') {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(price);
      }
      return 'N/A';
    };
  
    const formatPercentage = (value: number) => {
      if (typeof value === 'number') {
        return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
      }
      return 'N/A';
    };
  
    const handleSort = (key: keyof Coin) => {
      setSortConfig(current => ({
        key,
        direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
      }));
    };
  
    const getSortedCoins = (coinsToSort: Coin[]) => {
      return [...coinsToSort].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
  
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          // Handle string comparison
          const comparison = aValue.localeCompare(bValue);
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          // Handle number comparison
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        // Handle any other cases
        return 0;
      });
    };
  
    const sortedCoins = getSortedCoins(coins);
    const currentCoins = sortedCoins.slice(
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

  const CoinCard = ({ coin }: { coin: Coin }) => (
    <div 
      onClick={() => setSelectedCoin(coin)}
      className="bg-zinc-900 p-4 rounded-lg hover:bg-zinc-700/50 cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-3 mb-3">
        <img 
          src={coin.thumb} 
          alt={coin.name}
          className="w-8 h-8 rounded-full"
        />
        <div>
          <div className="font-medium text-white">{coin.name}</div>
          <div className="text-sm text-zinc-400">{coin.symbol.toUpperCase()}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <div className="text-zinc-400">Price</div>
          <div className="text-white font-medium">{formatUsdPrice(coin.price_usd)}</div>
        </div>
        <div>
          <div className="text-zinc-400">24h Change</div>
          <div className={`font-medium ${coin.price_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatPercentage(coin.price_change_percentage_24h)}
          </div>
        </div>
        <div>
          <div className="text-zinc-400">Market Cap</div>
          <div className="text-white font-medium">{formatUsdPrice(coin.market_cap)}</div>
        </div>
        <div>
          <div className="text-zinc-400">Volume (24h)</div>
          <div className="text-white font-medium">{coin.total_volume}</div>
        </div>
      </div>
      {coin.sparkline && (
        <div className="mt-4">
          <img 
            src={coin.sparkline} 
            alt={`${coin.name} price chart`}
            className="w-full h-12"
          />
        </div>
      )}
    </div>
  );

  if (selectedCoin) {
    return (
      <div className="w-full bg-zinc-800 rounded-lg overflow-hidden">
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <button 
            onClick={() => setSelectedCoin(null)}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to list
          </button>

            <div className="flex items-center justify-between">


       
            <div className="flex items-center gap-4">
                <img 
                src={selectedCoin.thumb} 
                alt={selectedCoin.name}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full"
                />
                <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">{selectedCoin.name}</h2>
                <p className="text-zinc-400">{selectedCoin.symbol.toUpperCase()}</p>
                </div>
            </div>

            {selectedCoin.sparkline && (
                <div className="mt-4 bg-zinc-900 p-3 sm:p-4 rounded-lg">
                <img 
                    src={selectedCoin.sparkline} 
                    alt={`${selectedCoin.name} price chart`}
                    className="w-full h-12"
                />
                </div>
            )}

          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
              <div className="text-sm text-zinc-500">Price</div>
              <div className="text-base sm:text-lg font-semibold text-white">
                {formatUsdPrice(selectedCoin.price_usd)}
              </div>
            </div>
            <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
              <div className="text-sm text-zinc-500">24h Change</div>
              <div className={`text-base sm:text-lg font-semibold ${selectedCoin.price_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatPercentage(selectedCoin.price_change_percentage_24h)}
              </div>
            </div>
            <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
              <div className="text-sm text-zinc-500">Market Cap</div>
              <div className="text-base sm:text-lg font-semibold text-white">{formatUsdPrice(selectedCoin.market_cap)}</div>
            </div>
            <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
              <div className="text-sm text-zinc-500">Volume (24h)</div>
              <div className="text-base sm:text-lg font-semibold text-white">{selectedCoin.total_volume}</div>
            </div>
          </div>


          {selectedCoin.content_description && (
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-semibold text-white">About</h3>
              <p className="text-sm text-zinc-400">{selectedCoin.content_description}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!toolInvocation.result) {
    return (
      <div className="w-full bg-zinc-800 rounded-lg overflow-hidden">
        <div className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">
            Loading trending cryptocurrencies...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-zinc-800 rounded-lg overflow-hidden">
      <div className="p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-white ">Trending Cryptocurrencies</h2>
        <p className="mb-4 sm:mb-6 text-sm text-zinc-500">Top 15 trending coins on CoinGecko</p>
        
        {/* Mobile View (Cards) remains the same */}
        <div className="lg:hidden space-y-3">
          {currentCoins.map((coin) => (
            <CoinCard key={coin.id} coin={coin} />
          ))}
        </div>

        {/* Desktop View (Table) with updated sorting */}
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
              {currentCoins.map((coin) => (
                <tr 
                  key={coin.id}
                  onClick={() => setSelectedCoin(coin)}
                  className="border-t border-zinc-700 hover:bg-zinc-700/50 cursor-pointer transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={coin.thumb} 
                        alt={coin.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <div className="font-medium text-white">{coin.name}</div>
                        <div className="text-sm text-zinc-400">{coin.symbol.toUpperCase()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right text-white">
                    {formatUsdPrice(coin.price_usd)}
                  </td>
                  <td className={`p-4 text-right ${coin.price_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatPercentage(coin.price_change_percentage_24h)}
                  </td>
                  <td className="p-4 text-right text-white">
                    #{coin.market_cap_rank}
                  </td>
                  <td className="p-4 text-right text-white">
                    {formatUsdPrice(coin.market_cap)}
                  </td>
                  <td className="p-4 text-right text-white">
                    {coin.total_volume}
                  </td>
                  <td className="p-4 w-32">
                    {coin.sparkline && (
                      <img 
                        src={coin.sparkline} 
                        alt={`${coin.name} price chart`}
                        className="w-full h-8"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination remains the same */}
        {coins.length > pageSize && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 px-2 sm:px-4">
            <div className="text-sm text-zinc-400 order-2 sm:order-1">
              Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, coins.length)} of {coins.length}
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
                onClick={() => setCurrentPage(p => Math.min(Math.floor(coins.length / pageSize), p + 1))}
                disabled={currentPage >= Math.floor(coins.length / pageSize)}
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

export default TrendingCoins;