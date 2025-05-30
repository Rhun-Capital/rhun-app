import React, { useEffect } from 'react';
import { ChevronLeftIcon, AlertCircleIcon } from '@/components/icons';
import { usePrivy } from '@privy-io/react-auth';
import _ from 'lodash';
import LoadingIndicator from '@/components/loading-indicator';
import CopyButton from '@/components/copy-button';
import TrackWalletModal from '@/components/tools/track-wallet-modal';
import { toast } from 'sonner';
import Image from 'next/image';
import { formatAmount } from '@/utils/format';
import { TokenDisplayMetadata, TokenHolder, TokenMetadata } from '@/types/token';
import { Activity, ActivityResponse } from '@/types/market';
import { FilterState } from '@/types/tools';
import { HolderData } from '@/types/token';

interface TopHoldersDisplayProps {
  toolCallId: string;
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    result?: any;
    state: 'call' | 'partial-call' | 'result';
  };
}

const ACTIVITY_TYPES = [
  'ACTIVITY_TOKEN_SWAP',
  'ACTIVITY_AGG_TOKEN_SWAP',
  'ACTIVITY_TOKEN_ADD_LIQ',
  'ACTIVITY_TOKEN_REMOVE_LIQ',
  'ACTIVITY_SPL_TOKEN_STAKE',
  'ACTIVITY_SPL_TOKEN_UNSTAKE',
  'ACTIVITY_SPL_TOKEN_WITHDRAW_STAKE',
  'ACTIVITY_SPL_INIT_MINT'
] as const;

const PAGE_SIZE = 10;

const TopHoldersDisplay: React.FC<TopHoldersDisplayProps> = ({ toolCallId, toolInvocation }) => {
  const { getAccessToken, user } = usePrivy();
  const [selectedHolder, setSelectedHolder] = React.useState<string | null>(null);
  const [activities, setActivities] = React.useState<ActivityResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isTrackModalOpen, setIsTrackModalOpen] = React.useState(false);
  const [trackedWallets, setTrackedWallets] = React.useState<Set<string>>(new Set());
  const [filters, setFilters] = React.useState<FilterState>({
    startTime: '',
    endTime: '',
    activityTypes: [],
    from: '',
    platforms: [],
    sources: [],
    token: ''
  });

  const handleTrackSuccess = (walletAddress: string) => {
    setTrackedWallets(prev => new Set([...prev, walletAddress]));
    setIsTrackModalOpen(false);
    toast.success('Wallet tracking started successfully');
  };

  const fetchActivities = React.useCallback(async (address: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setShowFilters(false);
      const token = await getAccessToken();
  
      const params = new URLSearchParams();
      params.append('address', address);
      params.append('page', currentPage.toString());
      params.append('page_size', PAGE_SIZE.toString());
  
      if (filters.startTime && filters.endTime) {
        params.append('block_time[]', Math.floor(new Date(filters.startTime).getTime() / 1000).toString());
        params.append('block_time[]', Math.floor(new Date(filters.endTime).getTime() / 1000).toString());
      }
  
      filters.activityTypes.forEach(type => params.append('activity_type[]', type));
      if (filters.from) params.append('from', filters.from);
      filters.platforms.slice(0, 5).forEach(p => params.append('platform[]', p));
      filters.sources.slice(0, 5).forEach(s => params.append('source[]', s));
      if (filters.token) params.append('token', filters.token);
  
      console.log('Fetching activities with params:', Object.fromEntries(params));

      const response = await fetch(`/api/tools/account-activities?${params.toString()}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          data: errorData
        });
        throw new Error(
          errorData?.error || 
          `Failed to fetch activities: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log('API Response Data:', {
        hasData: !!data.data,
        dataLength: data.data?.length,
        hasMetadata: !!data.metadata,
        tokenCount: Object.keys(data.metadata?.tokens || {}).length,
        sampleActivity: data.data?.[0],
        sampleToken: data.metadata?.tokens ? Object.entries(data.metadata.tokens)[0] : null
      });
      
      if (!data || !data.data) {
        throw new Error('Invalid response format from API');
      }

      setActivities(data);
      setSelectedHolder(address);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load holder activities';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [filters, getAccessToken, currentPage]);

  useEffect(() => {
    if (selectedHolder && currentPage > 0) {
      fetchActivities(selectedHolder);
    }
  }, [selectedHolder, currentPage, fetchActivities]);

  const HolderCard: React.FC<{ holder: TokenHolder; index: number }> = ({ holder, index }) => {
    const formatNumber = (num: number, decimals: number = 6) => {
      // First adjust for decimals
      const adjustedNum = num / Math.pow(10, decimals);
      
      // Then format with appropriate suffix
      if (adjustedNum >= 1e12) return `${(adjustedNum / 1e12).toFixed(2)}T`;
      if (adjustedNum >= 1e9) return `${(adjustedNum / 1e9).toFixed(2)}B`;
      if (adjustedNum >= 1e6) return `${(adjustedNum / 1e6).toFixed(2)}M`;
      if (adjustedNum >= 1e3) return `${(adjustedNum / 1e3).toFixed(2)}K`;
      return adjustedNum.toFixed(2);
    };

    return (
      <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg border border-zinc-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-sm font-medium text-white">
            #{index + 1}
          </div>
          <div>
            <div className="font-medium font-mono text-white">
              {holder.owner.slice(0, 4)}...{holder.owner.slice(-4)}
            </div>
            <div className="text-sm text-zinc-400">
              {formatNumber(holder.amount)} tokens
              {holder.percentage && (
                <span className="ml-2 text-indigo-400">
                  ({holder.percentage.toFixed(2)}%)
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => fetchActivities(holder.owner)}
          className="px-3 py-1.5 text-sm border border-indigo-500 text-indigo-400 rounded-md hover:bg-indigo-500/10 transition-colors"
        >
          View Activity
        </button>
      </div>
    );
  };

  const ActivityCard: React.FC<{ activity: Activity; token1: TokenMetadata; token2: TokenMetadata }> = ({ activity, token1, token2 }) => (
    <div className="border border-zinc-900 p-4 bg-zinc-900 rounded-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-2">
        <span className="text-sm font-medium text-white mb-1 sm:mb-0">
          {activity.activity_type.replace('ACTIVITY_', '')}
        </span>
        <span className="text-xs text-zinc-400">
          {new Date(activity.time).toLocaleString()}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            {token1?.token_icon ? (
              <img 
                src={token1.token_icon} 
                alt={token1.token_symbol} 
                className="w-5 h-5 rounded-full"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-xs">?</div>
            )}
            <span className="text-sm text-white">
              {formatAmount(activity.routers.amount1, activity.routers.token1_decimals)} {token1?.token_symbol}
            </span>
          </div>
          <span className="text-zinc-500 hidden sm:block">→</span>
          <span className="text-zinc-500 block sm:hidden">↓</span>
          <div className="flex items-center gap-2">
            {token2?.token_icon ? (
              <img 
                src={token2.token_icon} 
                alt={token2.token_symbol} 
                className="w-5 h-5 rounded-full"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-xs">?</div>
            )}
            <span className="text-sm text-white">
              {formatAmount(activity.routers.amount2, activity.routers.token2_decimals)} {token2?.token_symbol}
            </span>
          </div>
        </div>
        <div className="text-sm text-white w-full sm:w-auto text-left sm:text-right mt-2 sm:mt-0">
          ${activity.value.toFixed(2)}
        </div>
      </div>
    </div>
  );

  const PaginationControls: React.FC = () => (
    <div className="flex justify-between items-center mt-4 px-2">
      <button
        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        className="px-3 py-1 rounded bg-zinc-700 text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-600 transition-colors"
      >
        Previous
      </button>
      <span className="text-zinc-400">Page {currentPage}</span>
      <button
        onClick={() => setCurrentPage(p => p + 1)}
        disabled={!activities?.data || activities.data.length < PAGE_SIZE}
        className="px-3 py-1 rounded bg-zinc-700 text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-600 transition-colors"
      >
        Next
      </button>
    </div>
  );

  const FiltersPanel = React.memo(() => {
    const [localFilters, setLocalFilters] = React.useState<FilterState>(filters);
    
    const debouncedSetFilters = React.useCallback(
      _.debounce((newFilters: FilterState) => {
        setFilters(newFilters);
      }, 300),
      []
    );

    const handleLocalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setLocalFilters(prev => {
        const newFilters = { ...prev };
        if (name === 'platforms' || name === 'sources') {
          const addresses = value.split(',').map(addr => addr.trim()).filter(Boolean);
          (newFilters[name as keyof FilterState] as string[]) = addresses;
        } else {
          if (name === 'platforms' || name === 'sources') {
            (newFilters[name as keyof FilterState] as string[]) = value.split(',').map(addr => addr.trim()).filter(Boolean);
          } else {
            (newFilters[name as keyof FilterState] as string) = value;
          }
        }
        debouncedSetFilters(newFilters);
        return newFilters;
      });
    };

    const handleActivityTypeToggle = (type: typeof ACTIVITY_TYPES[number]) => {
      setLocalFilters(prev => {
        const newFilters = {
          ...prev,
          activityTypes: prev.activityTypes.includes(type)
            ? prev.activityTypes.filter(t => t !== type)
            : [...prev.activityTypes, type]
        };
        debouncedSetFilters(newFilters);
        return newFilters;
      });
    };

    return (
      <div className="bg-zinc-900 p-4 rounded-lg mb-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Start Time</label>
            <input
              type="datetime-local"
              name="startTime"
              value={localFilters.startTime}
              onChange={handleLocalFilterChange}
              className="w-full bg-zinc-800 rounded p-2 text-sm border border-zinc-700 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">End Time</label>
            <input
              type="datetime-local"
              name="endTime"
              value={localFilters.endTime}
              onChange={handleLocalFilterChange}
              className="w-full bg-zinc-800 rounded p-2 text-sm border border-zinc-700 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">Activity Types</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ACTIVITY_TYPES.map(type => (
              <div 
                key={type} 
                className="flex items-center gap-2 p-2 hover:bg-zinc-700 rounded cursor-pointer"
                onClick={() => handleActivityTypeToggle(type)}
              >
                <input
                  type="checkbox"
                  checked={localFilters.activityTypes.includes(type)}
                  onChange={() => handleActivityTypeToggle(type)}
                  className="rounded border-zinc-700 bg-zinc-800 w-4 h-4 cursor-pointer"
                />
                <span className="text-zinc-300 select-none text-sm">
                  {type.replace('ACTIVITY_', '')}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => selectedHolder && fetchActivities(selectedHolder)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    );
  });

  FiltersPanel.displayName = 'FiltersPanel';

  // Transform the data to match the TokenHolder interface
  const holders = React.useMemo(() => {
    if (!toolInvocation?.result) {
      return [];
    }
    
    // Convert result to array if it's an object
    const resultArray: HolderData[] = Array.isArray(toolInvocation.result) 
      ? toolInvocation.result 
      : Object.values(toolInvocation.result);
    
    if (!resultArray.length) {
      return [];
    }

    return resultArray.map(holder => ({
      owner: holder.owner || holder.address || '',
      amount: holder.amount || parseFloat(holder.balance || '0'),
      decimals: holder.decimals || 6, // Default to 6 decimals if not provided
      percentage: holder.percentage || 0,
      value: holder.value
    }));
  }, [toolInvocation?.result]);

  // Show loading state for both 'call' and 'partial-call' states
  if (toolInvocation.state !== 'result' || !toolInvocation.result) {
    return (
      <div className="p-4 bg-zinc-800 rounded-lg">
        <LoadingIndicator />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-zinc-800 rounded-lg">
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircleIcon />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // Default view - holders list
  return (
    <div className="p-4 bg-zinc-800 rounded-lg">
      {selectedHolder ? (
        <div>
          <button
            onClick={() => setSelectedHolder(null)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white mb-4"
          >
            <ChevronLeftIcon /> Back to Holders List
          </button>

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Holder Activities</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-1 text-sm rounded-md bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              {user && (
                <button
                  onClick={() => setIsTrackModalOpen(true)}
                  className="px-3 py-1 text-sm rounded-md bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors"
                >
                  Track Wallet
                </button>
              )}
            </div>
          </div>

          {/* Wallet Address Display */}
          <div className="bg-zinc-900 p-4 rounded-lg mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Wallet:</span>
              <span className="text-sm font-medium text-white font-mono">{selectedHolder}</span>
            </div>
            <CopyButton text={selectedHolder || ''} />
          </div>

          {showFilters && <FiltersPanel />}

          {activities?.data && activities.data.length > 0 ? (
            <div className="space-y-3">
              {activities.data.map((activity, index) => {
                const token1 = activities.metadata.tokens[activity.routers.token1];
                const token2 = activities.metadata.tokens[activity.routers.token2];
                return (
                  <ActivityCard 
                    key={index} 
                    activity={activity} 
                    token1={token1} 
                    token2={token2} 
                  />
                );
              })}
              <PaginationControls />
            </div>
          ) : (
            <div className="text-center text-zinc-400 py-8">
              No activities found for this holder
            </div>
          )}

          {isTrackModalOpen && user && (
            <TrackWalletModal
              isOpen={isTrackModalOpen}
              onClose={() => setIsTrackModalOpen(false)}
              onSuccess={() => handleTrackSuccess(selectedHolder)}
              walletAddress={selectedHolder}
              userId={user.id}
            />
          )}
        </div>
      ) : (
        <>
          <h3 className="text-lg font-semibold text-white mb-4">Top Token Holders</h3>
          <p className="mb-4 text-white">Click on a holder to view their recent activities like token swaps, staking, and more.</p>

          <div className="space-y-3">
            {holders.length > 0 ? (
              holders.map((holder, index) => (
                <HolderCard key={holder.owner} holder={holder} index={index} />
              ))
            ) : (
              <div className="text-center text-zinc-400 py-8">
                No holders found
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

TopHoldersDisplay.displayName = 'TopHoldersDisplay';

export default TopHoldersDisplay;