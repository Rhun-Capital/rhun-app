import React, { useEffect } from 'react';
import { ChevronLeftIcon } from '@/components/icons';
import { usePrivy } from '@privy-io/react-auth';
import _ from 'lodash';
import { AlertCircleIcon } from '@/components/icons';
import LoadingIndicator from '@/components/loading-indicator';
import CopyButton from '@/components/copy-button';
import TrackWalletModal from '@/components/tools/track-wallet-modal';
import { toast } from 'sonner';
import Image from 'next/image';

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

interface TopHoldersDisplayProps {
  toolCallId: string;
  toolInvocation: {
    toolName: string;
    args: { message: string };
    result?: TokenHolder[];
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

  const formatAmount = (amount: number, decimals: number) => {
    return (amount / Math.pow(10, decimals)).toFixed(decimals > 6 ? 6 : decimals);
  };

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

  useEffect(() => {
    if (selectedHolder && currentPage > 0) {
      fetchActivities(selectedHolder);
    }
  }, [selectedHolder, currentPage, fetchActivities]);

  const HolderCard: React.FC<{ holder: TokenHolder; index: number }> = ({ holder, index }) => (
    <div 
      className="flex items, start border border-zinc-900 justify-between p-3 bg-zinc-900 rounded-lg 
               hover:border-indigo-400 hover:shadow-lg transition-all duration-200 ease-in-out cursor-pointer"
      onClick={() => fetchActivities(holder.owner)}
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
      <CopyButton text={holder.owner} />
    </div>
  );

  const ActivityCard: React.FC<{ activity: Activity; token1: TokenMetadata; token2: TokenMetadata }> = ({ activity, token1, token2 }) => (
    <div className="border border-zinc-900 p-4 bg-zinc-900 rounded-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-2">
        <span className="text-sm font-medium mb-1 sm:mb-0">
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
            <span className="text-sm">
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
            <span className="text-sm">
              {formatAmount(activity.routers.amount2, activity.routers.token2_decimals)} {token2?.token_symbol}
            </span>
          </div>
        </div>
        <div className="text-sm text-zinc-400 w-full sm:w-auto text-left sm:text-right mt-2 sm:mt-0">
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

  if (isLoading) {
    return (
      <div className="p-6 bg-zinc-800 rounded-lg">
        <div className="text-center text-zinc-400">
          <LoadingIndicator/>
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

  if (selectedHolder && activities) {
    const isTracked = trackedWallets.has(selectedHolder);
    
    return (
      <div className="p-4 sm:p-6 bg-zinc-800 rounded-lg space-y-4">
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-6">
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

        {/* Wallet Info Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-zinc-900 rounded-lg border border-zinc-700">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">Wallet Activities</h2>
              <CopyButton text={selectedHolder}/>
            </div>
            <p className="text-zinc-400 font-mono text-sm mt-1">
              {selectedHolder.slice(0, 4)}...{selectedHolder.slice(-4)}
            </p>
          </div>
          
          <div className="mt-4 sm:mt-0">
            {isTracked ? (
              <div className="flex items-center gap-2 text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                <span>Wallet Tracked</span>
              </div>
            ) : (
              <button
                onClick={() => setIsTrackModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                Track Wallet
              </button>
            )}
          </div>
        </div>

        {/* Activity list */}
        <div className="space-y-3">
          {activities.data.length > 0 ? (
            <>
              {activities.data.map((activity, index) => (
                <ActivityCard
                  key={index}
                  activity={activity}
                  token1={activities.metadata.tokens[activity.routers.token1]}
                  token2={activities.metadata.tokens[activity.routers.token2]}
                />
              ))}
              <PaginationControls />
            </>
          ) : (
            <div className="text-center text-zinc-400 py-8">
              No activities found
            </div>
          )}
        </div>

        {/* Track Wallet Modal */}
        <TrackWalletModal
          isOpen={isTrackModalOpen}
          onClose={() => setIsTrackModalOpen(false)}
          onSuccess={() => handleTrackSuccess(selectedHolder)}
          walletAddress={selectedHolder}
          userId={user?.id || ''}
        />
      </div>
    );
  }

  // Default view - holders list
  return (
    <div key={toolCallId} className="p-4 sm:p-6 bg-zinc-800 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Top Token Holders</h3>
      <p className="mb-4">Click on a holder to view their recent activities like token swaps, staking, and more.</p>

      <div className="space-y-3">
        {toolInvocation.result && toolInvocation.result.map((holder, index) => (
          <HolderCard key={holder.owner} holder={holder} index={index} />
        ))}
      </div>
    </div>
  );
};

TopHoldersDisplay.displayName = 'TopHoldersDisplay';

export default TopHoldersDisplay;