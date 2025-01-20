// components/derivatives-exchanges.tsx
import React, { useState } from 'react';
import Link from 'next/link';
import { GlobeIcon, ChevronDownIcon, ChevronUpIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';

interface Exchange {
  name: string;
  id: string;
  open_interest_btc: number;
  trade_volume_24h_btc: string;
  number_of_perpetual_pairs: number;
  number_of_futures_pairs: number;
  image: string;
  year_established: number | null;
  country: string | null;
  description: string;
  url: string;
}

interface DerivativesExchangesProps {
  toolCallId: string;
  toolInvocation: {
    toolName: string;
    args: { message: string };
    result?: Exchange[];
  };
}

const ITEMS_PER_PAGE = 10;

const DerivativesExchanges: React.FC<DerivativesExchangesProps> = ({ toolCallId, toolInvocation }) => {
  const [sortField, setSortField] = useState<'open_interest' | 'volume'>('open_interest');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  if (!("result" in toolInvocation) || !toolInvocation.result) return null;

  const formatBTC = (amount: number | string) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₿${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const handleSort = (field: 'open_interest' | 'volume') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Reset to first page on sort
  };

  const sortedExchanges = [...toolInvocation.result].sort((a, b) => {
    const aValue = sortField === 'open_interest' 
      ? a.open_interest_btc 
      : parseFloat(a.trade_volume_24h_btc);
    const bValue = sortField === 'open_interest' 
      ? b.open_interest_btc 
      : parseFloat(b.trade_volume_24h_btc);
    
    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedExchanges.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedExchanges = sortedExchanges.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const SortIcon = ({ field }: { field: 'open_interest' | 'volume' }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon/>;
  };

  const Pagination = () => (
    <div className="flex items-center justify-between mt-4 text-sm">
      <div className="text-zinc-400">
        Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, sortedExchanges.length)} of {sortedExchanges.length} exchanges
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:hover:bg-transparent"
        >
          <ChevronLeftIcon />
        </button>
        
        <div className="flex items-center gap-1">
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`w-8 h-8 rounded-lg ${
                currentPage === i + 1 
                  ? 'bg-indigo-500 text-white' 
                  : 'hover:bg-zinc-700'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:hover:bg-transparent"
        >
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-zinc-800 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Derivatives Exchanges</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-zinc-400 text-sm">
            <tr>
              <th className="pb-4">#</th>
              <th className="pb-4">Exchange</th>
              <th 
                className="pb-4 text-right cursor-pointer hover:text-zinc-300"
                onClick={() => handleSort('open_interest')}
              >
                <div className="flex items-center justify-end gap-1">
                  Open Interest
                  <SortIcon field="open_interest" />
                </div>
              </th>
              <th 
                className="pb-4 text-right cursor-pointer hover:text-zinc-300"
                onClick={() => handleSort('volume')}
              >
                <div className="flex items-center justify-end gap-1">
                  24h Volume
                  <SortIcon field="volume" />
                </div>
              </th>
              <th className="pb-4 text-right">Perp Pairs</th>
              <th className="pb-4 text-right">Futures</th>
              <th className="pb-4 text-right">Est.</th>
              <th className="pb-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700">
            {paginatedExchanges.map((exchange, index) => (
              <tr key={exchange.id} className="group hover:bg-zinc-700/50 transition-colors">
                <td className="py-4 text-zinc-400">{startIndex + index + 1}</td>
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    {exchange.image && (
                      <img
                        src={exchange.image}
                        alt={exchange.name}
                        className="w-6 h-6 rounded-full"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    )}
                    <span className="font-medium">{exchange.name}</span>
                  </div>
                </td>
                <td className="py-4 text-right font-medium">
                  {formatBTC(exchange.open_interest_btc)}
                </td>
                <td className="py-4 text-right text-zinc-300">
                  {formatBTC(exchange.trade_volume_24h_btc)}
                </td>
                <td className="py-4 text-right text-zinc-300">
                  {exchange.number_of_perpetual_pairs}
                </td>
                <td className="py-4 text-right text-zinc-300">
                  {exchange.number_of_futures_pairs}
                </td>
                <td className="py-4 text-right text-zinc-400">
                  {exchange.year_established || '-'}
                </td>
                <td className="py-4 text-right">
                  {exchange.url && (
                    <Link
                      href={exchange.url}
                      target="_blank"
                      className="text-zinc-400 hover:text-zinc-300 transition-colors"
                    >
                      <GlobeIcon />
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination />
    </div>
  );
};

export default DerivativesExchanges;