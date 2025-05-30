'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { GlobeIcon, ChevronDownIcon, ChevronUpIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { DerivativesExchangesProps } from '@/types/tools';

type ToolInvocationState = 'call' | 'partial-call' | 'result';

const ITEMS_PER_PAGE = 10;

export default function DerivativesExchanges({ toolCallId, toolInvocation }: DerivativesExchangesProps) {
  const [sortField, setSortField] = useState<'open_interest' | 'volume'>('open_interest');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewType, setViewType] = useState<'table' | 'cards'>('table');

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setViewType('cards');
    }
  }, []);

  const exchanges = useMemo(() => {
    if (!toolInvocation) return [];
    try {
      const data = JSON.parse(toolInvocation);
      return data.exchanges || [];
    } catch (e) {
      return [];
    }
  }, [toolInvocation]);

  if (!exchanges.length) {
    return null;
  }

  const formatBTC = (amount: number | string) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₿${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const sortedExchanges = [...exchanges].sort((a, b) => {
    const aValue = sortField === 'open_interest' ? a.open_interest_btc : parseFloat(a.trade_volume_24h_btc);
    const bValue = sortField === 'open_interest' ? b.open_interest_btc : parseFloat(b.trade_volume_24h_btc);
    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const totalPages = Math.ceil(sortedExchanges.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedExchanges = sortedExchanges.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  
  const handleSort = (field: 'open_interest' | 'volume') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Reset to first page on sort
  };

  const SortIcon = ({ field }: { field: 'open_interest' | 'volume' }) => (
    sortField === field ? (sortDirection === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon/>) : null
  );

  const CardView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {paginatedExchanges.map((exchange, index) => (
        <div key={exchange.id} className="bg-zinc-900 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {exchange.image && (
                <img
                  src={exchange.image}
                  alt={exchange.name}
                  className="w-8 h-8 rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <span className="font-medium text-white">{exchange.name}</span>
            </div>
            <span className="text-zinc-400">#{startIndex + index + 1}</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-zinc-400">Open Interest</span>
              <span className="font-medium text-white">{formatBTC(exchange.open_interest_btc)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-zinc-400">24h Volume</span>
              <span className="text-white">{formatBTC(exchange.trade_volume_24h_btc)}</span>
            </div>
          </div>

          {exchange.url && (
            <div className="mt-4 flex justify-end">
              <Link
                href={exchange.url}
                target="_blank"
                className="text-zinc-400 hover:text-zinc-300"
              >
                <GlobeIcon />
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const Pagination = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 text-sm">
      <div className="text-zinc-400 text-center sm:text-left">
        {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, sortedExchanges.length)} of {sortedExchanges.length}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-lg hover:bg-zinc-700 disabled:opacity-50"
        >
          <ChevronLeftIcon />
        </button>
        
        <div className="flex items-center gap-1 overflow-x-auto">
          {Array.from({length: totalPages}, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`w-8 h-8 rounded-lg ${
                currentPage === i + 1 ? 'bg-indigo-500 text-white' : 'hover:bg-zinc-700'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg hover:bg-zinc-700 disabled:opacity-50"
        >
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 bg-zinc-800 rounded-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h3 className="text-lg font-semibold text-white">Derivatives Exchanges</h3>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewType('table')}
            className={`p-2 rounded-lg ${viewType === 'table' ? 'bg-zinc-700' : 'hover:bg-zinc-700'}`}
          >
            Table
          </button>
          <button
            onClick={() => setViewType('cards')}
            className={`p-2 rounded-lg ${viewType === 'cards' ? 'bg-zinc-700' : 'hover:bg-zinc-700'}`}
          >
            Cards
          </button>
        </div>
      </div>

      {viewType === 'table' ? (
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-full table-fixed">
            <thead className="text-zinc-400 text-sm">
              <tr>
                <th className="pb-4 w-16">#</th>
                <th className="pb-4 w-[30%]">Exchange</th>
                <th 
                  className="pb-4 text-right cursor-pointer hover:text-zinc-300 w-[25%]"
                  onClick={() => handleSort('open_interest')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Open Interest
                    <SortIcon field="open_interest" />
                  </div>
                </th>
                <th 
                  className="pb-4 text-right cursor-pointer hover:text-zinc-300 w-[25%]"
                  onClick={() => handleSort('volume')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Volume (24h)
                    <SortIcon field="volume" />
                  </div>
                </th>
                <th className="pb-4 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedExchanges.map((exchange, index) => (
                <tr key={exchange.id} className="border-t border-zinc-700">
                  <td className="py-4 text-zinc-400 w-16">#{startIndex + index + 1}</td>
                  <td className="py-4 w-[30%]">
                    <div className="flex items-center gap-3">
                      {exchange.image && (
                        <img
                          src={exchange.image}
                          alt={exchange.name}
                          className="w-6 h-6 rounded-full flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <span className="truncate text-white">{exchange.name}</span>
                    </div>
                  </td>
                  <td className="py-4 text-right font-medium text-white w-[25%]">
                    {formatBTC(exchange.open_interest_btc)}
                  </td>
                  <td className="py-4 text-right text-white w-[25%]">
                    {formatBTC(exchange.trade_volume_24h_btc)}
                  </td>
                  <td className="py-4 text-right w-16">
                    {exchange.url && (
                      <Link
                        href={exchange.url}
                        target="_blank"
                        className="text-zinc-400 hover:text-zinc-300 inline-flex"
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
      ) : (
        <CardView />
      )}

      <Pagination />
    </div>
  );
}