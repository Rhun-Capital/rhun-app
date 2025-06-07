import React, { useState } from 'react';
import { ChevronLeftIcon, AlertCircleIcon, GlobeIcon } from '@/components/icons';
import Image from 'next/image';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import CopyButton from '@/components/copy-button';
import { 
  getTokenStatistics, 
  getTokenHolderBreakdown, 
  getHolderDeltas 
} from '@/utils/agent-tools';
import { Coin, CoinDetail } from '../../types/search';

const SearchResults: React.FC<{ toolCallId: string; toolInvocation: any }> = ({ toolCallId, toolInvocation }) => {
  const [selectedCoin, setSelectedCoin] = useState<CoinDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getAccessToken } = usePrivy();

  const formatPrice = (price: number | undefined) => {
    if (price === undefined) return 'N/A';
    return price.toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  };

  const formatPercentage = (percentage: number | undefined) => {
    if (percentage === undefined) return 'N/A';
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const handleCoinClick = async (coinId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tools/coin/${coinId}`, {
        headers: {
          'Authorization': `Bearer ${await getAccessToken()}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch coin details');
      const coinData = await response.json();
      setSelectedCoin(coinData);
    } catch (err) {
      console.error('Error fetching coin details:', err);
      setError('Failed to load coin details');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-4 sm:p-6 bg-zinc-800 rounded-lg text-center text-zinc-400">Loading...</div>;
  }

  if (selectedCoin) {
    return (
      <div className="p-4 sm:p-6 bg-zinc-800 rounded-lg space-y-4">
        {/* Back button */}
        <button 
          onClick={() => setSelectedCoin(null)}
          className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
        >
          <ChevronLeftIcon />
          Back
        </button>

        {/* Coin header */}
        <div className="flex flex-col sm:flex-row gap-4 sm:justify-between items-start sm:items-center">
          <div className="flex items-center gap-3">
            <Image
              src={selectedCoin.image.large}
              alt={selectedCoin.name}
              width={40}
              height={40}
              className="rounded-full sm:w-12 sm:h-12"
            />
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">{selectedCoin.name}</h2>
              <p className="text-sm text-zinc-400">{selectedCoin.symbol.toUpperCase()}</p>
            </div>
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto">
            <div className="text-xl sm:text-2xl font-bold text-white">
              {formatPrice(selectedCoin.market_data.current_price.usd)}
            </div>
            <div className={`text-sm ${selectedCoin.market_data.price_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPercentage(selectedCoin.market_data.price_change_percentage_24h)}
            </div>
          </div>
        </div>

        {/* Price changes */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { label: '24h', value: selectedCoin.market_data.price_change_percentage_24h },
            { label: '7d', value: selectedCoin.market_data.price_change_percentage_7d },
            { label: '30d', value: selectedCoin.market_data.price_change_percentage_30d }
          ].map(({ label, value }) => (
            <div key={label} className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
              <div className="text-xs sm:text-sm text-zinc-500">{label}</div>
              <div className={`text-xs sm:text-sm ${value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatPercentage(value)}
              </div>
            </div>
          ))}
        </div>

        {/* Market data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
          {[
            { label: 'Market Cap', value: formatPrice(selectedCoin.market_data.market_cap.usd) },
            { label: '24h Volume', value: formatPrice(selectedCoin.market_data.total_volume.usd) },
            { label: 'Circulating Supply', value: selectedCoin.market_data.circulating_supply.toLocaleString() },
            { label: 'Total Supply', value: selectedCoin.market_data.total_supply?.toLocaleString() || 'N/A' }
          ].map(({ label, value }) => (
            <div key={label} className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
              <div className="text-xs sm:text-sm text-zinc-500">{label}</div>
              <div className="text-sm sm:text-lg font-semibold text-white truncate">{value}</div>
            </div>
          ))}
        </div>

        {/* Holder Information */}
        {selectedCoin.holder_stats ? (
          <div>
            {/* Holder Statistics - only shown if data is meaningful */}
            {selectedCoin.holder_stats.statistics?.avg_time_held && 
             selectedCoin.holder_stats.statistics?.retention_rate !== null && 
             selectedCoin.holder_stats.statistics?.retention_rate !== undefined && 
             Number(selectedCoin.holder_stats.statistics.retention_rate) > 0 ? (
              <div className="mt-4 sm:mt-6">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Holder Statistics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
                    <div className="text-xs sm:text-sm text-zinc-500">Average Time Held</div>
                    <div className="text-sm sm:text-lg font-semibold text-white">
                      {selectedCoin.holder_stats.statistics?.avg_time_held 
                        ? `${Math.floor(selectedCoin.holder_stats.statistics.avg_time_held / 86400)} days`
                        : 'N/A'}
                    </div>
                  </div>
                  <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
                    <div className="text-xs sm:text-sm text-zinc-500">Retention Rate</div>
                    <div className="text-sm sm:text-lg font-semibold text-white">
                      {selectedCoin.holder_stats.statistics?.retention_rate !== null && selectedCoin.holder_stats.statistics?.retention_rate !== undefined
                        ? `${(Number(selectedCoin.holder_stats.statistics.retention_rate) * 100).toFixed(1)}%`
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Holder Distribution - always shown if holder_stats exists */}
            <div className="mt-4 sm:mt-6">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Holder Distribution</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
                  <div className="text-xs sm:text-sm text-zinc-500">Total Holders</div>
                  <div className="text-sm sm:text-lg font-semibold text-white">
                    {selectedCoin.holder_stats.breakdown?.total_holders !== null && selectedCoin.holder_stats.breakdown?.total_holders !== undefined
                      ? Number(selectedCoin.holder_stats.breakdown.total_holders).toLocaleString()
                      : 'N/A'}
                  </div>
                </div>
                <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
                  <div className="text-xs sm:text-sm text-zinc-500">Whales ({'>'}$100k)</div>
                  <div className="text-sm sm:text-lg font-semibold text-white">
                    {selectedCoin.holder_stats.breakdown?.holders_over_100k_usd !== null && selectedCoin.holder_stats.breakdown?.holders_over_100k_usd !== undefined
                      ? Number(selectedCoin.holder_stats.breakdown.holders_over_100k_usd).toLocaleString()
                      : 'N/A'}
                  </div>
                </div>
                <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
                  <div className="text-xs sm:text-sm text-zinc-500">Dolphins ({'>'}$10k)</div>
                  <div className="text-sm sm:text-lg font-semibold text-white">
                    {selectedCoin.holder_stats.breakdown?.holders_over_10000_usd !== null && selectedCoin.holder_stats.breakdown?.holders_over_10000_usd !== undefined
                      ? Number(selectedCoin.holder_stats.breakdown.holders_over_10000_usd).toLocaleString()
                      : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Holder Changes - only shown if deltas exist */}
            {selectedCoin.holder_stats.deltas ? (
              <div className="mt-4 sm:mt-6">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Holder Changes</h3>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
                    <div className="text-xs sm:text-sm text-zinc-500">7 Days</div>
                    <div className={`text-sm sm:text-lg font-semibold ${(selectedCoin.holder_stats.deltas['7days'] || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {selectedCoin.holder_stats.deltas['7days'] !== undefined
                        ? `${selectedCoin.holder_stats.deltas['7days'] >= 0 ? '+' : ''}${Number(selectedCoin.holder_stats.deltas['7days']).toLocaleString()}`
                        : 'N/A'}
                    </div>
                  </div>
                  <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
                    <div className="text-xs sm:text-sm text-zinc-500">14 Days</div>
                    <div className={`text-sm sm:text-lg font-semibold ${(selectedCoin.holder_stats.deltas['14days'] || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {selectedCoin.holder_stats.deltas['14days'] !== undefined
                        ? `${selectedCoin.holder_stats.deltas['14days'] >= 0 ? '+' : ''}${Number(selectedCoin.holder_stats.deltas['14days']).toLocaleString()}`
                        : 'N/A'}
                    </div>
                  </div>
                  <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
                    <div className="text-xs sm:text-sm text-zinc-500">30 Days</div>
                    <div className={`text-sm sm:text-lg font-semibold ${(selectedCoin.holder_stats.deltas['30days'] || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {selectedCoin.holder_stats.deltas['30days'] !== undefined
                        ? `${selectedCoin.holder_stats.deltas['30days'] >= 0 ? '+' : ''}${Number(selectedCoin.holder_stats.deltas['30days']).toLocaleString()}`
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Description */}
        {selectedCoin.description?.en && (
          <div className="mt-4 sm:mt-6">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2">About</h3>
            <div 
              className="text-xs sm:text-sm text-zinc-400 max-w-full line-clamp-4 sm:line-clamp-none"
              dangerouslySetInnerHTML={{ __html: selectedCoin.description.en }}
            />
          </div>
        )}

        {/* Contract Addresses */}
        {selectedCoin.platforms && Object.keys(selectedCoin.platforms).length > 0 && Object.keys(selectedCoin.platforms)[0] !== '' && (
          <div className="mt-4 sm:mt-6">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Contract Addresses</h3>
            <div className="space-y-2">
              {Object.entries(selectedCoin.platforms).map(([platform, address]) => 
                address && (
                  <div key={platform} className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
                    <div className="text-xs sm:text-sm text-zinc-500 capitalize mb-1">{platform}</div>
                    <div className="flex items-center gap-2 justify-between">
                    <div className="text-xs sm:text-sm font-mono text-white break-all">
                      {address}
                    </div>
                    <CopyButton text={address}/>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}        

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center mt-4 pt-4 border-t border-zinc-700">
          <div className="flex flex-col gap-1 text-xs text-zinc-500 order-2 sm:order-1">
            <div>Last updated: {new Date(selectedCoin.last_updated).toLocaleString()}</div>
          </div>
          <div className="flex gap-4 order-1 sm:order-2">
            {selectedCoin.links.homepage[0] && (
              <Link href={selectedCoin.links.homepage[0]} target="_blank" className="text-zinc-400 hover:text-zinc-300">
                <GlobeIcon />
              </Link>
            )}
            {selectedCoin.links.twitter_screen_name && (
              <Link href={`https://x.com/${selectedCoin.links.twitter_screen_name}`} target="_blank" className="text-zinc-400 hover:text-zinc-300">
                <Image src="/images/social/x-logo.svg" alt="X" width={15} height={15} />
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-zinc-800 rounded-lg">
      <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Search Results</h3>
      <p className="mb-4 text-white">Click the token for more details like the contract address, price, market cap and more.</p>

      <div className="space-y-2 sm:space-y-3">
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircleIcon />
            {error}
          </div>
        )}
        
        {"result" in toolInvocation && toolInvocation.result && toolInvocation.result.coins && toolInvocation.result.coins.length > 0 ? (
          toolInvocation.result.coins.map((coin: Coin) => (
            <div 
              key={coin.id} 
              className="flex items-center border border-zinc-900 justify-between p-3 bg-zinc-900 rounded-lg 
                       hover:border-indigo-400 hover:shadow-lg cursor-pointer w-full sm:w-[300px]"
              onClick={() => handleCoinClick(coin.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                {coin.thumb ? (
                  <img src={coin.thumb} alt={coin.name} className="w-8 h-8 rounded-full flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400 flex-shrink-0">
                    N/A
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-medium text-white truncate">{coin.name}</div>
                  <div className="text-sm text-zinc-400 truncate">{coin.symbol.toUpperCase()}</div>
                </div>
              </div>
              {coin.marketCapRank && (
                <div className="text-right flex-shrink-0">
                  <div className="text-xs sm:text-sm text-zinc-400">
                    #{coin.marketCapRank}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-sm text-zinc-400 text-center py-4">
            No results found
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;