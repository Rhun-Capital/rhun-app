import React, { useState, useMemo } from 'react';
import type { ToolInvocation as AIToolInvocation } from '@ai-sdk/ui-utils';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import CopyButton from '@/components/copy-button';
import { GlobeIcon } from '@/components/icons';
import Link from 'next/link';

interface NftData {
  id: string;
  name: string;
  symbol: string;
  description: string;
  asset_platform_id: string;
  contract_address: string;
  floor_price: {
    native_currency: number;
    usd: number;
  };
  market_cap: {
    native_currency: number;
    usd: number;
  };
  volume_24h: {
    native_currency: number;
    usd: number;
  };
  floor_price_24h_percentage_change: {
    native_currency: number;
    usd: number;
  };
  total_supply: number;
  one_day_sales: number;
  number_of_unique_addresses: number;
  image: {
    small: string;
    small_2x: string;
  };
  timestamp: string;
}

interface TableColumn {
  header: string;
  accessorKey: keyof NftData | string;
  cell: (data: NftData) => React.ReactNode;
  sortable?: boolean;
}

const TopNFTsResults: React.FC<{ 
  toolCallId: string; 
  toolInvocation: AIToolInvocation 
}> = ({ toolCallId, toolInvocation }) => {
  const [selectedNft, setSelectedNft] = useState<NftData | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof NftData | string;
    direction: 'asc' | 'desc';
  }>({ key: 'floor_price.usd', direction: 'desc' });
  const detailsRef = React.useRef<HTMLDivElement>(null);

  const pageSize = 10;
  const nfts = ('result' in toolInvocation) ? toolInvocation.result : [];

  const formatPrice = (price: number | undefined) => {
    if (price === undefined) return 'N/A';
    return price.toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  };

  const formatPercentage = (value: number | undefined) => {
    if (value === undefined) return 'N/A';
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const columns: TableColumn[] = [
    {
      header: 'Collection',
      accessorKey: 'name',
      sortable: true,
      cell: (nft) => (
        <div className="flex items-center gap-3">
          {nft.image?.small ? (
            <Image 
              src={nft.image.small}
              alt={nft.name}
              width={24}
              height={24}
              className="rounded-lg"
            />
          ) : (
            <div className="w-6 h-6 rounded-lg bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">
              ?
            </div>
          )}
          <div>
            <div className="font-medium">{nft.name}</div>
            <div className="text-sm text-zinc-400">{nft.symbol}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Floor Price',
      accessorKey: 'floor_price.usd',
      sortable: true,
      cell: (nft) => (
        <div className="text-right">
          <div>{formatPrice(nft.floor_price.usd)}</div>
          <div className={`text-sm ${nft.floor_price_24h_percentage_change.usd > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatPercentage(nft.floor_price_24h_percentage_change.usd)}
          </div>
        </div>
      )
    },
    {
      header: 'Market Cap',
      accessorKey: 'market_cap.usd',
      sortable: true,
      cell: (nft) => (
        <div className="text-right">
          {formatPrice(nft.market_cap.usd)}
        </div>
      )
    },
    {
      header: 'Volume (24h)',
      accessorKey: 'volume_24h.usd',
      sortable: true,
      cell: (nft) => (
        <div className="text-right">
          {formatPrice(nft.volume_24h.usd)}
        </div>
      )
    },
    {
      header: 'Holders',
      accessorKey: 'number_of_unique_addresses',
      sortable: true,
      cell: (nft) => (
        <div className="text-right">
          {nft.number_of_unique_addresses.toLocaleString()}
        </div>
      )
    }
  ];

  // Handle sorting
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return nfts;

    return [...nfts].sort((a, b) => {
      const key = sortConfig.key;
      // Handle nested properties (e.g., 'floor_price.usd')
      const getValue = (obj: any, key: string) => {
        return key.split('.').reduce((o, i) => o?.[i], obj);
      };
      
      const aValue = getValue(a, key);
      const bValue = getValue(b, key);

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [nfts, sortConfig]);

  const currentData = sortedData.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const NFTCard = ({ nft }: { nft: NftData }) => (
    <div className="p-4 bg-zinc-900 rounded-lg hover:bg-zinc-700/50 cursor-pointer" 
         onClick={() => setSelectedNft(nft)}>
      <div className="flex items-center gap-3 mb-3">
        {nft.image?.small ? (
          <Image 
            src={nft.image.small}
            alt={nft.name}
            width={32}
            height={32}
            className="rounded-lg"
          />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">
            ?
          </div>
        )}
        <div>
          <div className="font-medium">{nft.name}</div>
          <div className="text-sm text-zinc-400">{nft.symbol}</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-zinc-400">Floor Price</span>
          <div className="text-right">
            <div className="text-sm font-medium">{formatPrice(nft.floor_price.usd)}</div>
            <div className={`text-xs ${nft.floor_price_24h_percentage_change.usd > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatPercentage(nft.floor_price_24h_percentage_change.usd)}
            </div>
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-zinc-400">Market Cap</span>
          <span className="text-sm font-medium">{formatPrice(nft.market_cap.usd)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-zinc-400">Volume (24h)</span>
          <span className="text-sm font-medium">{formatPrice(nft.volume_24h.usd)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-zinc-400">Holders</span>
          <span className="text-sm font-medium">{nft.number_of_unique_addresses.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );

  if (selectedNft) {
    return (
      <div ref={detailsRef} className="p-4 sm:p-6 bg-zinc-800 rounded-lg space-y-4">
        <button 
          onClick={() => setSelectedNft(null)}
          className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to list
        </button>

        {/* Header with name and price */}
        <div className="flex flex-col sm:flex-row gap-4 sm:justify-between items-start sm:items-center">
          <div className="flex items-center gap-3">
            {selectedNft.image?.small ? (
              <Image
                src={selectedNft.image.small}
                alt={selectedNft.name}
                width={48}
                height={48}
                className="rounded-lg"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-zinc-700 flex items-center justify-center text-base text-zinc-400">
                ?
              </div>
            )}
            <div>
              <h2 className="text-lg sm:text-xl font-bold">{selectedNft.name}</h2>
              <p className="text-sm text-zinc-400">{selectedNft.symbol.toUpperCase()}</p>
            </div>
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto">
            <div className="text-xl sm:text-2xl font-bold">
              {formatPrice(selectedNft.floor_price.usd)}
            </div>
            <div className={`text-sm ${selectedNft.floor_price_24h_percentage_change.usd > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatPercentage(selectedNft.floor_price_24h_percentage_change.usd)}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
          {[
            { label: 'Market Cap', value: formatPrice(selectedNft.market_cap.usd) },
            { label: 'Volume (24h)', value: formatPrice(selectedNft.volume_24h.usd) },
            { label: 'Holders', value: selectedNft.number_of_unique_addresses.toLocaleString() },
            { label: 'Supply', value: selectedNft.total_supply.toLocaleString() },
            { label: 'Platform', value: selectedNft.asset_platform_id },
            { label: '24h Sales', value: selectedNft.one_day_sales.toLocaleString() }
          ].map(({ label, value }) => (
            <div key={label} className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
              <div className="text-xs sm:text-sm text-zinc-500">{label}</div>
              <div className="text-sm sm:text-base font-semibold truncate">{value}</div>
            </div>
          ))}
        </div>

        {/* Contract Address */}
        <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg flex justify-between items-center">
          <div>
            <div className="text-xs sm:text-sm text-zinc-400">Contract Address</div>
            <div className="text-xs sm:text-sm font-semibold text-zinc-300 break-all truncate overflow-hidden w-48 sm:w-auto">
              {selectedNft.contract_address}
            </div>
          </div>
          <CopyButton text={selectedNft.contract_address} />
        </div>

        {/* Footer with Last Updated */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-700">
          <div className="text-xs text-zinc-500">
            Last updated: {new Date(selectedNft.timestamp).toLocaleString()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-zinc-800 rounded-lg">
      {/* Mobile View (Cards) */}
      <div className="lg:hidden">
        <div className="grid gap-4">
          {currentData.map((nft: NftData) => (
            <NFTCard key={nft.id} nft={nft} />
          ))}
        </div>
      </div>

      {/* Desktop View (Table) */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map((column) => (
                <th 
                  key={column.accessorKey}
                  className="px-4 py-3 text-left text-sm font-semibold text-zinc-400 whitespace-nowrap"
                >
                  {column.sortable ? (
                    <button 
                      onClick={() => handleSort(column.accessorKey)}
                      className="hover:text-white flex items-center gap-2"
                    >
                      {column.header}
                      {sortConfig.key === column.accessorKey ? (
                        sortConfig.direction === 'asc' ? (
                          <ChevronDown className="h-4 w-4"/>
                        ) : (
                          <ChevronUp className="h-4 w-4"/>
                        )
                      ) : (<ChevronDown className="h-4 w-4"/>)}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentData.map((nft: NftData) => (
              <tr 
                key={nft.id}
                onClick={() => setSelectedNft(nft)}
                className="border-t border-zinc-700 hover:bg-zinc-700/50 cursor-pointer"
              >
                {columns.map((column) => (
                  <td 
                    key={`${nft.id}-${column.accessorKey}`}
                    className="px-4 py-3 whitespace-nowrap"
                  >
                    {column.cell(nft)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {sortedData.length > pageSize && (
        <div className="mt-4 flex items-center justify-between px-4">
          <div className="text-sm text-zinc-400">
            Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, sortedData.length)} of {sortedData.length}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="p-2 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(Math.floor(sortedData.length / pageSize), p + 1))}
              disabled={currentPage >= Math.floor(sortedData.length / pageSize)}
              className="p-2 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopNFTsResults;