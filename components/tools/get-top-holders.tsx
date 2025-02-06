// components/TopHoldersDisplay.tsx
import React, { useEffect } from 'react';
import { ChevronLeftIcon } from '@/components/icons';
import { usePrivy } from '@privy-io/react-auth';
import _ from 'lodash';
import { AlertCircleIcon } from '@/components/icons';
import LoadingIndicator from '@/components/loading-indicator';
import CopyButton from '@/components/copy-button';

interface TokenHolder {
  owner: string;
  amount: number;
  percentage: number;
}

interface TokenMetadata {
  token_address: string;
  token_name: string;
  token_symbol: string;
  token_icon: string;
}

interface Activity {
  block_time: number;
  activity_type: string;
  value: number;
  routers: {
    token1: string;
    token1_decimals: number;
    amount1: number;
    token2: string;
    token2_decimals: number;
    amount2: number;
  };
  time: string;
  from_address: string;
  platform: string[];
  sources: string[];
}

interface ActivityResponse {
  data: Activity[];
  metadata: {
    tokens: { [key: string]: TokenMetadata };
  };
}

interface FilterState {
  startTime: string;
  endTime: string;
  activityTypes: string[];
  from: string;
  platforms: string[];
  sources: string[];
  token: string;
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

interface TopHoldersDisplayProps {
  toolCallId: string;
  toolInvocation: {
    toolName: string;
    args: { message: string };
    result?: TokenHolder[];
  };
}

const PAGE_SIZE = 10;

const TopHoldersDisplay: React.FC<TopHoldersDisplayProps> = ({ toolCallId, toolInvocation }) => {
  const { getAccessToken } = usePrivy();
  const [selectedHolder, setSelectedHolder] = React.useState<string | null>(null);
  const [activities, setActivities] = React.useState<ActivityResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [filters, setFilters] = React.useState<FilterState>({
    startTime: '',
    endTime: '',
    activityTypes: [],
    from: '',
    platforms: [],
    sources: [],
    token: ''
  });

  useEffect(() => {
    if (selectedHolder && currentPage > 0) {
      fetchActivities(selectedHolder);
    }
  }, [selectedHolder, currentPage]);

  // const totalItems = activities?.total || 0;
  // const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const paginatedActivities = activities?.data || [];

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
  
      const response = await fetch(`/api/tools/account-activities?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
  
      if (!response.ok) throw new Error('Failed to fetch activities');
      const data = await response.json();
      setActivities(data);
      setSelectedHolder(address);
    } catch (error) {
      setError('Failed to load holder activities');
      console.error('Error fetching activities:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, getAccessToken, currentPage]);

  const formatAmount = (amount: number, decimals: number) => {
    return (amount / Math.pow(10, decimals)).toFixed(decimals > 6 ? 6 : decimals);
  };

  const PaginationControls = () => (
    <div className="flex justify-between items-center mt-4 px-2">
      <button
        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        className="px-3 py-1 rounded bg-zinc-700 text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-600 transition-colors"
      >
        Previous
      </button>
      <span className="text-zinc-400">
        Page {currentPage}
      </span>
      <button
        onClick={() => setCurrentPage(p => p + 1)}
        disabled={!activities?.data || activities.data.length < 10}
        className="px-3 py-1 rounded bg-zinc-700 text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-600 transition-colors"
      >
        Next
      </button>
    </div>
  );

  // Define literal types for input field names
  type FilterInputName = 'startTime' | 'endTime' | 'from' | 'token' | 'platforms' | 'sources';

  const FiltersPanel = React.memo(() => {
    // Local state for filter values
    const [localFilters, setLocalFilters] = React.useState<FilterState>(filters);
    
    // Debounced update function
    const debouncedSetFilters = React.useCallback(
      _.debounce((newFilters: FilterState) => {
        setFilters(newFilters);
      }, 300),
      []
    );

    FiltersPanel.displayName = 'FiltersPanel';

    // Handle input changes with proper typing
    const handleLocalFilterChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const name = e.target.name as FilterInputName;
      const value = e.target.value;
      
      setLocalFilters(prev => {
        const newFilters = { ...prev };
        
        if (name === 'platforms' || name === 'sources') {
          const addresses = value.split(',').map(addr => addr.trim()).filter(Boolean);
          newFilters[name] = addresses;
        } else if (name === 'startTime' || name === 'endTime' || name === 'from' || name === 'token') {
          newFilters[name] = value;
        }
        
        debouncedSetFilters(newFilters);
        return newFilters;
      });
    }, [debouncedSetFilters]);

    // Handle activity type toggle with proper typing
    const handleActivityTypeToggle = React.useCallback((type: typeof ACTIVITY_TYPES[number]) => {
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
    }, [debouncedSetFilters]);
  
    return (
      <div className="bg-zinc-900 p-4 rounded-lg mb-4 space-y-4">
        {/* Time Range Filters */}
        <div className="grid grid-cols-2 gap-4">
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

        {/* Address Filters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">From Address</label>
            <input
              type="text"
              name="from"
              value={localFilters.from}
              onChange={handleLocalFilterChange}
              placeholder="Solana address"
              className="w-full bg-zinc-800 rounded p-2 text-sm border border-zinc-700 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Token Address</label>
            <input
              type="text"
              name="token"
              value={localFilters.token}
              onChange={handleLocalFilterChange}
              placeholder="Token address"
              className="w-full bg-zinc-800 rounded p-2 text-sm border border-zinc-700 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Platform and Source Filters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Platform Addresses (max 5, comma-separated)
            </label>
            <input
              type="text"
              name="platforms"
              value={localFilters.platforms.join(', ')}
              onChange={handleLocalFilterChange}
              placeholder="addr1, addr2, ..."
              className="w-full bg-zinc-800 rounded p-2 text-sm border border-zinc-700 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Source Addresses (max 5, comma-separated)
            </label>
            <input
              type="text"
              name="sources"
              value={localFilters.sources.join(', ')}
              onChange={handleLocalFilterChange}
              placeholder="addr1, addr2, ..."
              className="w-full bg-zinc-800 rounded p-2 text-sm border border-zinc-700 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Activity Types */}
        <div>
          <label className="block text-sm text-zinc-400 mb-2">Activity Types</label>
          <div className="grid grid-cols-2 gap-2">
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

        {/* Apply Filters Button */}
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

  if (isLoading) {
    return (
      <div className="p-6 bg-zinc-800 rounded-lg">
        <div className="text-center text-zinc-400">
          <LoadingIndicator/>
        </div>
      </div>
    );
  }

  if (selectedHolder && activities) {
    return (
      <div className="p-6 bg-zinc-800 rounded-lg space-y-4">
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => setSelectedHolder(null)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeftIcon />
            Back to holders
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {/* Filters */}
        {showFilters && <FiltersPanel />}

        {/* Holder header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold">Wallet Activities</h2>
            <div className="flex items-center gap-2">
              <p className="text-zinc-400 font-mono">
                {selectedHolder.slice(0, 4)}...{selectedHolder.slice(-4)}
              </p>
              <CopyButton text={selectedHolder}/>
            </div>
          </div>
        </div>

     {/* Activity list */}
     <div className="space-y-3">
          {paginatedActivities.length > 0 ? (
            <>
              {paginatedActivities.map((activity, index) => {
                const token1 = activities.metadata.tokens[activity.routers.token1];
                const token2 = activities.metadata.tokens[activity.routers.token2];

                return (
                  <div 
                    key={index}
                    className="border border-zinc-900 p-4 bg-zinc-900 rounded-lg"
                  >
   
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium">
                      {activity.activity_type.replace('ACTIVITY_', '')}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {new Date(activity.time).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                      {token1?.token_icon ? (
                          <img 
                            src={token1.token_icon} 
                            alt={token1.token_symbol} 
                            className="w-5 h-5 rounded-full"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-xs">
                            ?
                          </div>
                        )}
                        <span className="text-sm">
                          {formatAmount(activity.routers.amount1, activity.routers.token1_decimals)} {token1?.token_symbol}
                        </span>
                      </div>
                      <span className="text-zinc-500">→</span>
                      <div className="flex items-center gap-2">
                      {token2?.token_icon ? (
                          <img 
                            src={token2.token_icon} 
                            alt={token2.token_symbol} 
                            className="w-5 h-5 rounded-full"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-xs">
                            ?
                          </div>
                        )}
                        <span className="text-sm">
                          {formatAmount(activity.routers.amount2, activity.routers.token2_decimals)} {token2?.token_symbol}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-zinc-400">
                      ${activity.value.toFixed(2)}
                    </div>
                  </div>
                </div>
                );
              })}
              <PaginationControls />
            </>
          ) : (
            <div className="text-center text-zinc-400 py-8">
              No activities found
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-zinc-800 rounded-lg">
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircleIcon />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div key={toolCallId} className="p-6 bg-zinc-800 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Top Token Holders</h3>
      <p className="mb-4">Click the holder to see recent activities like token swaps, staking, and more. </p>

      <div className="space-y-3">
        {toolInvocation.result && toolInvocation.result.map((holder, index) => (
          <div 
            key={holder.owner}
            onClick={() => fetchActivities(holder.owner)}
            className="flex items-center border border-zinc-900 justify-between p-3 bg-zinc-900 rounded-lg 
                     hover:border-indigo-400 hover:shadow-lg transition-all duration-200 ease-in-out cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">
                #{index + 1}
              </div>
              <div>
                <div className="font-medium font-mono">
                  {holder.owner.slice(0, 4)}...{holder.owner.slice(-4)}
                </div>
                <div className="text-sm text-zinc-400">
                  {holder.amount.toLocaleString()} tokens
                </div>
              </div>
            </div>
            {/* <div className="text-right text-sm text-zinc-400">
              {holder.percentage.toFixed(2)}%
            </div> */}
          </div>
        ))}
      </div>
    </div>
  );
};

TopHoldersDisplay.displayName = 'TopHoldersDisplay';

export default TopHoldersDisplay;