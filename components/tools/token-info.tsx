import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AlertCircleIcon, GlobeIcon } from '@/components/icons';
import CopyButton from '@/components/copy-button';
import { MarketData } from '@/types/market';
import { TokenInfoData, ToolInvocation, OnChainData } from '@/types/tools';
import { TokenInfoProps } from '@/types/token';

const TokenInfo: React.FC<TokenInfoProps> = ({ toolCallId, toolInvocation }) => {
  if (!("result" in toolInvocation)) return null;
  
  if (toolInvocation.result && "error" in toolInvocation.result) {
    return (
      <div key={toolCallId} className="p-4 sm:p-6 bg-zinc-800 rounded-lg">
        <div className="text-zinc-400 flex items-center gap-2">
          <AlertCircleIcon />
          {toolInvocation.result.error}
        </div>
      </div>
    );
  }

  const result = toolInvocation.result as TokenInfoData;
  const { market, onchain, status } = result;

  if (!market && !onchain) {
    return (
      <div key={toolCallId} className="p-4 sm:p-6 bg-zinc-800 rounded-lg">
        <div className="text-zinc-400 flex items-center gap-2">
          <AlertCircleIcon />
          No token information available
        </div>
      </div>
    );
  }

  const onchainAttributes = onchain?.attributes;

  return (
    <div key={toolCallId} className="p-4 sm:p-6 bg-zinc-800 rounded-lg space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 sm:gap-6 mb-4">
        <div className="flex items-center gap-4">
          {market?.image || (onchainAttributes?.image_url && onchainAttributes.image_url !== 'missing.png') ? (
            <Image
              src={market?.image || onchainAttributes?.image_url || ''}
              alt={market?.name || onchainAttributes?.name || 'Token'}
              width={40}
              height={40}
              className="rounded-full sm:w-[55px] sm:h-[55px]"
            />
          ) : (
            <div className="w-10 h-10 sm:w-[55px] sm:h-[55px] rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">
              N/A
            </div>
          )}
          <div>
            <h3 className="text-base sm:text-lg font-semibold">
              {market?.name || onchainAttributes?.name}
            </h3>
            <p className="text-sm text-zinc-400">
              {(market?.symbol || onchainAttributes?.symbol || '').toUpperCase()}
            </p>
          </div>
        </div>
        <div className="text-center sm:text-right">
          <div className="text-lg sm:text-xl font-bold">
            {market?.currentPrice || onchainAttributes?.price_usd 
              ? `$${(market?.currentPrice || parseFloat(onchainAttributes?.price_usd || '0')).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6
                })}`
              : 'N/A'
            }
          </div>
          {market && (
            <div className={`text-sm ${
              market.priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {market.priceChange24h.toFixed(2)}%
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
          <div className="text-xs sm:text-sm text-zinc-400">Market Cap</div>
          <div className="text-sm sm:text-lg font-semibold truncate">
            ${market?.marketCap || onchainAttributes?.market_cap_usd
              ? (market?.marketCap || parseFloat(onchainAttributes?.market_cap_usd || '0')).toLocaleString()
              : 'N/A'
            }
          </div>
        </div>

        <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
          <div className="text-xs sm:text-sm text-zinc-400">24h Volume</div>
          <div className="text-sm sm:text-lg font-semibold truncate">
            ${market?.totalVolume || onchainAttributes?.volume_usd?.h24
              ? (market?.totalVolume || parseFloat(onchainAttributes?.volume_usd?.h24 || '0')).toLocaleString()
              : 'N/A'
            }
          </div>
        </div>

        <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
          <div className="text-xs sm:text-sm text-zinc-400">Total Supply</div>
          <div className="text-sm sm:text-lg font-semibold truncate">
            {market?.totalSupply || onchainAttributes?.total_supply
              ? (market?.totalSupply || parseFloat(onchainAttributes?.total_supply || '0')).toLocaleString()
              : 'N/A'
            }
          </div>
        </div>

        <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
          <div className="text-xs sm:text-sm text-zinc-400">Total Reserve in USD</div>
          <div className="text-sm sm:text-lg font-semibold truncate">
            ${onchainAttributes?.total_reserve_in_usd
              ? parseFloat(onchainAttributes.total_reserve_in_usd).toLocaleString()
              : 'N/A'
            }
          </div>
        </div>

        {onchainAttributes && (
          <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg col-span-1 sm:col-span-2 flex justify-between items-center">
            <div>
              <div className="text-xs sm:text-sm text-zinc-400">Contract Address</div>
              <div className="text-xs sm:text-sm font-semibold text-zinc-300 break-all truncate">
                {onchainAttributes.address}
              </div>
            </div>
            <CopyButton text={onchainAttributes.address}/>
          </div>
        )}
      </div>

      {/* Holder Statistics */}
      {result.holder_stats && (
        <>
          <div className="mt-4 sm:mt-6">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Holder Statistics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
              <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
                <div className="text-xs sm:text-sm text-zinc-500">Average Time Held</div>
                <div className="text-sm sm:text-lg font-semibold text-white">
                  {result.holder_stats.statistics?.avg_time_held 
                    ? `${Math.floor(result.holder_stats.statistics.avg_time_held / 86400)} days`
                    : 'N/A'}
                </div>
              </div>
              <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
                <div className="text-xs sm:text-sm text-zinc-500">Retention Rate</div>
                <div className="text-sm sm:text-lg font-semibold text-white">
                  {result.holder_stats.statistics?.retention_rate !== null && result.holder_stats.statistics?.retention_rate !== undefined
                    ? `${(Number(result.holder_stats.statistics.retention_rate) * 100).toFixed(1)}%`
                    : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 sm:mt-6">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Holder Distribution</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
              <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
                <div className="text-xs sm:text-sm text-zinc-500">Total Holders</div>
                <div className="text-sm sm:text-lg font-semibold text-white">
                  {result.holder_stats.breakdown?.total_holders !== null && result.holder_stats.breakdown?.total_holders !== undefined
                    ? Number(result.holder_stats.breakdown.total_holders).toLocaleString()
                    : 'N/A'}
                </div>
              </div>
              <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
                <div className="text-xs sm:text-sm text-zinc-500">Whales ({'>'}$100k)</div>
                <div className="text-sm sm:text-lg font-semibold text-white">
                  {result.holder_stats.breakdown?.holders_over_100k_usd !== null && result.holder_stats.breakdown?.holders_over_100k_usd !== undefined
                    ? Number(result.holder_stats.breakdown.holders_over_100k_usd).toLocaleString()
                    : 'N/A'}
                </div>
              </div>
              <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
                <div className="text-xs sm:text-sm text-zinc-500">Dolphins ({'>'}$10k)</div>
                <div className="text-sm sm:text-lg font-semibold text-white">
                  {result.holder_stats.breakdown?.holders_over_10000_usd !== null && result.holder_stats.breakdown?.holders_over_10000_usd !== undefined
                    ? Number(result.holder_stats.breakdown.holders_over_10000_usd).toLocaleString()
                    : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {result.holder_stats.deltas && (
            <div className="mt-4 sm:mt-6">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Holder Changes</h3>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {[
                  { label: '7 Days', value: result.holder_stats.deltas['7days'] },
                  { label: '14 Days', value: result.holder_stats.deltas['14days'] },
                  { label: '30 Days', value: result.holder_stats.deltas['30days'] }
                ].map(({ label, value }) => (
                  <div key={label} className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
                    <div className="text-xs sm:text-sm text-zinc-500">{label}</div>
                    <div className={`text-sm sm:text-lg font-semibold ${value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {value !== null && value !== undefined ? `${value > 0 ? '+' : ''}${value.toLocaleString()}` : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Description */}
      {market?.description && (
        <div className="text-xs sm:text-sm text-zinc-400 mt-4 line-clamp-3 sm:line-clamp-none">
          {market.description}
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-between items-start sm:items-center mt-4">
        {market?.lastUpdated && (
          <div className="text-xs text-zinc-500 order-2 sm:order-1">
            Last updated: {new Date(market.lastUpdated).toLocaleString()}
          </div>
        )}

        <div className="flex gap-4 order-1 sm:order-2">
          {market?.homePage && (
            <Link href={market.homePage} target="_blank" className="text-zinc-400 hover:text-zinc-300">
              <GlobeIcon/>
            </Link>
          )}
          
          {market?.twitter && (
            <Link 
              href={`https://x.com/${market.twitter}`} 
              target="_blank"
              className="text-zinc-400 hover:text-zinc-300"
            >
              <Image src="/images/social/x-logo.svg" alt="X Platform" width={15} height={15} />
            </Link>
          )}
        </div>
      </div>

      {!status.market && status.onchain && (
        <div className="text-xs sm:text-sm text-zinc-400 mt-4">
          Note: Using on-chain data. Some market data may be limited.
        </div>
      )}

      <div className="text-xs text-zinc-500 mt-4">
        Data powered by CoinGecko and HolderScan
      </div>
    </div>
  );
};

export default TokenInfo;