import React, { useState, useMemo } from 'react';
import type { ToolInvocation as AIToolInvocation } from '@ai-sdk/ui-utils';
import {ChevronLeft, ChevronRight, ChevronDown, ChevronUp} from 'lucide-react'
import Image from 'next/image';
import CopyButton from '@/components/copy-button';
import { GlobeIcon } from '@/components/icons';
import Link from 'next/link';

interface CoinData {
    id: string;
    name: string;
    symbol: string;
    description: string;
    current_price_usd: number;
    market_cap_usd: number;
    total_volume_usd: number;
    categories: string[];
    last_updated: string;
    activated_at: number;
    score: number;
    thumb?: string;
    homepage?: string;      // Added
    twitter?: string;      // Added
    contract_address: string;
  }

interface TableColumn {
  header: string;
  accessorKey: keyof CoinData;
  cell: (data: CoinData) => React.ReactNode;
  sortable?: boolean;
}

const RecentCoinsResults: React.FC<{ 
  toolCallId: string; 
  toolInvocation: AIToolInvocation 
}> = ({ toolCallId, toolInvocation }) => {
  const [selectedCoin, setSelectedCoin] = useState<CoinData | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof CoinData | null;
    direction: 'asc' | 'desc';
  }>({ key: 'activated_at', direction: 'desc' });
  const detailsRef = React.useRef<HTMLDivElement>(null);

  const pageSize = 10;
  const coins = ('result' in toolInvocation) ? toolInvocation.result : [];

  const formatPrice = (price: number | undefined) => {
    if (price === undefined) return 'N/A';
    return price.toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  };

  const formatMarketCap = (marketCap: number | undefined) => {
    if (marketCap === undefined) return 'N/A';
    return marketCap.toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const columns: TableColumn[] = [
    {
      header: 'Name',
      accessorKey: 'name',
      sortable: true,
      cell: (coin) => (
        <div className="flex items-center gap-3">
          {coin.thumb ? (
            <Image 
              src={coin.thumb}
              alt={coin.name}
              width={24}
              height={24}
              className="rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">
              ?
            </div>
          )}
          <div>
            <div className="font-medium">{coin.name}</div>
            <div className="text-sm text-zinc-400">{coin.symbol}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Market Cap',
      accessorKey: 'market_cap_usd',
      sortable: true,
      cell: (coin) => (
        <div className="text-right">{formatMarketCap(coin.market_cap_usd)}</div>
      )
    },
    {
      header: 'Price',
      accessorKey: 'current_price_usd',
      sortable: true,
      cell: (coin) => (
        <div className="text-right">{formatPrice(coin.current_price_usd)}</div>
      )
    },
    {
      header: 'Volume',
      accessorKey: 'total_volume_usd',
      sortable: true,
      cell: (coin) => (
        <div className="text-right">{formatMarketCap(coin.total_volume_usd)}</div>
      )
    },
    {
      header: 'Listed',
      accessorKey: 'activated_at',
      sortable: true,
      cell: (coin) => (
        <div className="text-right">{formatDate(coin.activated_at)}</div>
      )
    }
  ];

  // Handle sorting
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return coins;

    return [...coins].sort((a, b) => {
      const key = sortConfig.key as keyof CoinData;
      if (a[key] < b[key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[key] > b[key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [coins, sortConfig]);

  // Get current page data
  const currentData = sortedData.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  const handleSort = (key: keyof CoinData) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleCoinSelect = (coin: CoinData) => {
    setSelectedCoin(coin);
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // If a coin is selected, show the detail view
  if (selectedCoin) {
    return (
      <div ref={detailsRef} className="p-4 sm:p-6 bg-zinc-800 rounded-lg space-y-4">
        <button 
          onClick={() => setSelectedCoin(null)}
          className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to list
        </button>
  
        {/* Header with name and price */}
        <div className="flex flex-col sm:flex-row gap-4 sm:justify-between items-start sm:items-center">
          <div className="flex items-center gap-3">
            {selectedCoin.thumb ? (
              <Image
                src={selectedCoin.thumb}
                alt={selectedCoin.name}
                width={48}
                height={48}
                className="rounded-full"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center text-base text-zinc-400">
                ?
              </div>
            )}
            <div>
              <h2 className="text-lg sm:text-xl font-bold">{selectedCoin.name}</h2>
              <p className="text-sm text-zinc-400">{selectedCoin.symbol.toUpperCase()}</p>
            </div>
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto">
            <div className="text-xl sm:text-2xl font-bold">
              {formatPrice(selectedCoin.current_price_usd)}
            </div>
          </div>
        </div>
  
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
          {[
            { label: 'Market Cap', value: formatMarketCap(selectedCoin.market_cap_usd) },
            { label: 'Volume', value: formatMarketCap(selectedCoin.total_volume_usd) },
            { label: 'Listed', value: formatDate(selectedCoin.activated_at) }
          ].map(({ label, value }) => (
            <div key={label} className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
              <div className="text-xs sm:text-sm text-zinc-500">{label}</div>
              <div className="text-sm sm:text-lg font-semibold truncate">{value}</div>
            </div>
          ))}
  
          {/* Contract Address */}
          {selectedCoin.id && (
            <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg col-span-1 sm:col-span-2 flex justify-between items-center">
              <div>
                <div className="text-xs sm:text-sm text-zinc-400">Contract Address</div>
                <div className="text-xs sm:text-sm font-semibold text-zinc-300 break-all truncate overflow-hidden w-48 sm:w-auto">
                  {selectedCoin.contract_address}
                </div>
              </div>
              <CopyButton text={selectedCoin.contract_address}/>
            </div>
          )}
        </div>
  
        {/* Categories */}
        {selectedCoin.categories && selectedCoin.categories.length > 0 && (
          <div>
            <h3 className="text-base font-semibold mb-2">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {selectedCoin.categories.map(category => (
                <span key={category} className="px-2 py-1 bg-zinc-900 rounded-full text-xs">
                  {category}
                </span>
              ))}
            </div>
          </div>
        )}
  
        {/* Description */}
        {selectedCoin.description && (
          <div className="text-xs sm:text-sm text-zinc-400 mt-4 line-clamp-3 sm:line-clamp-none">
            <h3 className="text-base font-semibold mb-2">About</h3>
            <p>{selectedCoin.description}</p>
          </div>
        )}
  
        {/* Footer with Links and Last Updated */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-between items-start sm:items-center mt-4 pt-4 border-t border-zinc-700">
          <div className="text-xs text-zinc-500 order-2 sm:order-1">
            Last updated: {new Date(selectedCoin.last_updated).toLocaleString()}
          </div>
  
          <div className="flex gap-4 order-1 sm:order-2">
            {selectedCoin.homepage && (
              <Link href={selectedCoin.homepage} target="_blank" className="text-zinc-400 hover:text-zinc-300">
                <GlobeIcon />
              </Link>
            )}
            
            {selectedCoin.twitter && (
              <Link 
                href={`https://x.com/${selectedCoin.twitter}`} 
                target="_blank"
                className="text-zinc-400 hover:text-zinc-300"
              >
                <Image src="/images/social/x-logo.svg" alt="X Platform" width={15} height={15} />
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const CoinCard = ({ coin }: { coin: CoinData }) => (
    <div className="p-4 bg-zinc-900 rounded-lg hover:bg-zinc-700/50" onClick={() => handleCoinSelect(coin)}>
      <div className="flex items-center gap-3 mb-3">
        {coin.thumb ? (
          <Image 
            src={coin.thumb}
            alt={coin.name}
            width={32}
            height={32}
            className="rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">
            ?
          </div>
        )}
        <div>
          <div className="font-medium">{coin.name}</div>
          <div className="text-sm text-zinc-400">{coin.symbol}</div>
        </div>
      </div>
  
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-zinc-400">Price</span>
          <span className="text-sm font-medium">{formatPrice(coin.current_price_usd)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-zinc-400">Market Cap</span>
          <span className="text-sm font-medium">{formatMarketCap(coin.market_cap_usd)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-zinc-400">Volume</span>
          <span className="text-sm font-medium">{formatMarketCap(coin.total_volume_usd)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-zinc-400">Listed</span>
          <span className="text-sm font-medium">{formatDate(coin.activated_at)}</span>
        </div>
      </div>
    </div>
  );  

  return (
    <div className="p-4 sm:p-6 bg-zinc-800 rounded-lg">

    {/* Mobile View (Cards) */}
    <div className="lg:hidden">
      <h3 className="text-base sm:text-lg font-semibold mb-2">Recent Coins</h3>
      <div className="grid gap-4">
        {currentData.map((coin: CoinData) => (
          <CoinCard key={coin.id} coin={coin} />
        ))}
      </div>
    </div>

    {/* Desktop View (Table) */}
    <div className="hidden lg:block overflow-x-auto">
        <table className="w-full ">
          <thead>
            <tr>
              {columns.map((column) => (
                <th 
                  key={column.accessorKey}
                  className="px-4 py-3 text-left text-sm font-semibold text-zinc-400 whitespace-nowrap cursor-pointer"
                >
                  
                    
                    {column.sortable && (
                      <button 
                        onClick={() => handleSort(column.accessorKey)}
                        className="hover:text-white"
                      >
                        <div className="flex items-center gap-2">
                        {column.header}
                        {sortConfig.key === column.accessorKey ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronDown className="h-4 w-4"/>
                          ) : (
                            <ChevronUp className="h-4 w-4"/>
                          )
                        ) : (<ChevronDown className="h-4 w-4"/>)}
                        </div>
                      </button>
                    )}
                  
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentData.map((coin: CoinData) => (
              <tr 
                key={coin.id}
                onClick={() => handleCoinSelect(coin)}
                className="border-t border-zinc-700 hover:bg-zinc-700/50 whitespace-nowrap cursor-pointer"
              >
                {columns.map((column) => (
                  <td 
                    key={`${coin.id}-${column.accessorKey}`}
                    className="px-4 py-3"
                  >
                    {column.cell(coin)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    {/* Pagination (shared between views) */}
    {(sortedData.length > 10) &&
    <div className="mt-4 flex items-center justify-between px-4">
        <div className="text-sm text-zinc-400">
          Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, sortedData.length)} of {sortedData.length}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="p-2 rounded-lg hover:bg-zinc-700 disabled:opacity-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.min(Math.floor(sortedData.length / pageSize), p + 1))}
            disabled={currentPage >= Math.floor(sortedData.length / pageSize)}
            className="p-2 rounded-lg hover:bg-zinc-700 disabled:opacity-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>}
    </div>
  );
};

export default RecentCoinsResults;