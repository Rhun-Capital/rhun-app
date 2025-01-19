import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AlertCircleIcon, GlobeIcon } from '@/components/icons';

interface OnChainData {
    id: string;
    type: string;
    attributes: {
        address: string;
        name: string;
        symbol: string;
        image_url: string;
        coingecko_coin_id: string;
        decimals: number;
        total_supply: string;
        price_usd: string;
        fdv_usd: string;
        total_reserve_in_usd: string;
        volume_usd: {
        h24: string;
        };
        market_cap_usd: string;
    };
    relationships: {
        top_pools: {
        data: Array<{
            id: string;
            type: string;
        }>;
        };
    };
  included: Array<any>; // We can type this if needed
}

interface MarketData {
  name: string;
  symbol: string;
  image: string;
  marketCap: number;
  currentPrice: number;
  priceChange24h: number;
  totalVolume: number;
  circulatingSupply: number;
  totalSupply: number;
  description: string;
  lastUpdated: string;
  homePage: string;
  twitter: string;
}

interface TokenData {
  onchain: OnChainData | null;
  market: MarketData | null;
  status: {
    onchain: boolean;
    market: boolean;
  };
}

interface ToolInvocation {
  toolName: string;
  args: { message: string };
  result?: TokenData | { error: string };
}

interface TokenInfoProps {
  toolCallId: string;
  toolInvocation: ToolInvocation;
}

const TokenInfo: React.FC<TokenInfoProps> = ({ toolCallId, toolInvocation }) => {
  if (!("result" in toolInvocation)) return null;
  
  if (toolInvocation.result && "error" in toolInvocation.result) {
    return (
      <div key={toolCallId} className="p-6 bg-zinc-800 rounded-lg">
        <div className="text-zinc-400 flex items-center gap-2">
          <AlertCircleIcon />
          {toolInvocation.result.error}
        </div>
      </div>
    );
  }

  const { market, onchain, status } = toolInvocation.result as TokenData;

  if (!market && !onchain) {
    return (
      <div key={toolCallId} className="p-6 bg-zinc-800 rounded-lg">
        <div className="text-zinc-400 flex items-center gap-2">
          <AlertCircleIcon />
          No token information available
        </div>
      </div>
    );
  }

  const onchainAttributes = onchain?.attributes;

  return (
    <div key={toolCallId} className="p-6 bg-zinc-800 rounded-lg space-y-4">
      <div className="flex justify-between items-start mb-4">
        <div>
        {market?.image || (onchainAttributes?.image_url && onchainAttributes.image_url !== 'missing.png') ? (
            <Image
              src={market?.image || onchainAttributes?.image_url || ''}
              alt={market?.name || onchainAttributes?.name || 'Token'}
              width={55}
              height={55}
              className="rounded-full"
            />
          ) : (
            <div className="w-[55px] h-[55px] rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">
              N/A
            </div>
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold">
            {market?.name || onchainAttributes?.name}
          </h3>
          <p className="text-zinc-400">
            {(market?.symbol || onchainAttributes?.symbol || '').toUpperCase()}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold">
            {market?.currentPrice || onchainAttributes?.price_usd 
              ? `${(market?.currentPrice || parseFloat(onchainAttributes?.price_usd || '0')).toLocaleString(undefined, {
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

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 p-4 rounded-lg">
          <div className="text-sm text-zinc-400">Market Cap</div>
          <div className="text-lg font-semibold">
            {market?.marketCap || onchainAttributes?.market_cap_usd
              ? `${(market?.marketCap || parseFloat(onchainAttributes?.market_cap_usd || '0')).toLocaleString()}`
              : 'N/A'
            }
          </div>
        </div>

        <div className="bg-zinc-900 p-4 rounded-lg">
          <div className="text-sm text-zinc-400">24h Volume</div>
          <div className="text-lg font-semibold">
            {market?.totalVolume || onchainAttributes?.volume_usd?.h24
              ? `${(market?.totalVolume || parseFloat(onchainAttributes?.volume_usd?.h24 || '0')).toLocaleString()}`
              : 'N/A'
            }
          </div>
        </div>

        <div className="bg-zinc-900 p-4 rounded-lg">
          <div className="text-sm text-zinc-400">Total Supply</div>
          <div className="text-lg font-semibold">
            {market?.totalSupply || onchainAttributes?.total_supply
              ? (market?.totalSupply || parseFloat(onchainAttributes?.total_supply || '0')).toLocaleString()
              : 'N/A'
            }
          </div>
        </div>

        <div className="bg-zinc-900 p-4 rounded-lg">
          <div className="text-sm text-zinc-400">Total Reserve in USD</div>
          <div className="text-lg font-semibold">
            {onchainAttributes?.total_reserve_in_usd
              ? `${parseFloat(onchainAttributes.total_reserve_in_usd).toLocaleString()}`
              : 'N/A'
            }
          </div>
        </div>

        {onchainAttributes && (
          <div className="bg-zinc-900 p-4 rounded-lg col-span-2">
            <div className="text-sm text-zinc-400">Contract Address</div>
            <div className="text-sm font-semibold text-zinc-300 truncate">
              {onchainAttributes.address}
            </div>
          </div>
        )}
      </div>

      {market?.description && (
        <div className="mt-4 text-sm text-zinc-400">
          {market.description}
        </div>
      )}

      <div className="flex flex-row gap-4 justify-between items-center">
        {market?.lastUpdated && (
          <div className="text-xs text-zinc-500 mt-4">
            Last updated: {new Date(market.lastUpdated).toLocaleString()}
          </div>
        )}

        <div className="flex flex-row gap-4 mt-3 mr-2">
          {market?.homePage && (
            <Link href={market.homePage} target="_blank" className="text-zinc-400 hover:text-zinc-300">
              <GlobeIcon size={20} />
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
        <div className="text-sm text-zinc-400 mt-4">
          Note: Using on-chain data. Some market data may be limited.
        </div>
      )}
    </div>
  );
};

export default TokenInfo;