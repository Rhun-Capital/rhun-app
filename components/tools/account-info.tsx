import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import { AlertCircleIcon } from '@/components/icons';
import LoadingIndicator from '@/components/loading-indicator';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/use-subscription';
import CopyButton from '@/components/copy-button';
import TrackWalletModal from '@/components/tools/track-wallet-modal';

interface TrackingFilters {
  minAmount?: number;
  specificToken?: string;
  platform?: string[];
  activityTypes?: string[];
  sort_by?: string;
  sort_order?: string;
}

// Add these interfaces to your existing ones
interface TrackingOptions {
  filters: TrackingFilters;
  showFilters: boolean;
  name: string;
  tags: string[];
  tagInput: string;
}



interface AccountData {
  account: string;
  lamports: number;
  type: string;
  executable: boolean;
  owner_program: string;
  rent_epoch: number;
  is_oncurve: boolean;
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
}

interface ActivityResponse {
  data: Activity[];
  metadata: {
    tokens: {
      [key: string]: {
        token_address: string;
        token_name: string;
        token_symbol: string;
        token_icon: string;
      }
    }
  };
}

interface AccountInfoProps {
  toolCallId: string;
  toolInvocation: {
    toolName: string;
    args: { message: string };
    result?: { success: boolean; data: AccountData } | { error: string };
  };
}

const PAGE_SIZE = 10;

const AccountInfo: React.FC<AccountInfoProps> = ({ toolCallId, toolInvocation }) => {
  const { getAccessToken, user } = usePrivy();
  const [activities, setActivities] = useState<ActivityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTrackLoading, setIsTrackLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTracked, setIsTracked] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);


  const [trackingOptions, setTrackingOptions] = useState<TrackingOptions>({
    filters: {
      activityTypes: ['ACTIVITY_TOKEN_SWAP', 'ACTIVITY_AGG_TOKEN_SWAP'],
      minAmount: 0,
      platform: [],
      specificToken: '',
      sort_by: 'block_time',
      sort_order: 'desc'
    },
    showFilters: false,
    name: '',
    tags: [],
    tagInput: ''
  });
  
  const handleTrackSuccess = () => {
    setIsTracked(true);
    setIsTrackModalOpen(false);
  };
  
  
  const handleFilterChange = (key: keyof TrackingFilters, value: any) => {
    setTrackingOptions(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [key]: value
      }
    }));
  };  

  const addTag = () => {
    const newTag = trackingOptions.tagInput.trim();
    if (newTag && !trackingOptions.tags.includes(newTag)) {
      setTrackingOptions(prev => ({
        ...prev,
        tags: [...prev.tags, newTag],
        tagInput: ''
      }));
    }
  };
  
  const removeTag = (tagToRemove: string) => {
    setTrackingOptions(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };  

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTrackingOptions(prev => ({
      ...prev,
      tagInput: e.target.value
    }));
  };
  
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };  

  // Handle NaN values and convert to SOL with proper formatting
  const formatSolBalance = (lamports: number): string => {
    const solBalance = (lamports || 0) / 1e9;
    return isNaN(solBalance) ? "0" : solBalance.toFixed(4);
  };

  // Format amount for token values
  const formatAmount = (amount: number, decimals: number) => {
    return (amount / Math.pow(10, decimals)).toFixed(decimals > 6 ? 6 : decimals);
  };

  // Get account data once before effect
  const accountData = toolInvocation.result && "data" in toolInvocation.result ? toolInvocation.result.data : null;

  useEffect(() => {
    let mounted = true;

    const fetchActivities = async () => {
      if (!accountData?.account) return;
      
      try {
        setIsLoading(true);
        setError(null);
        const token = await getAccessToken();

        const params = new URLSearchParams({
          address: accountData.account,
          page: currentPage.toString(),
          page_size: PAGE_SIZE.toString()
        });

        const response = await fetch(`/api/tools/account-activities?${params.toString()}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!mounted) return;

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to fetch activities: ${response.status}`);
        }
        const data = await response.json();
        if (mounted) {
          setActivities(data);
        }
      } catch (error) {
        if (mounted) {
          setError('Failed to load account activities');
          console.error('Error fetching activities:', error);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchActivities();

    return () => {
      mounted = false;
    };
  }, [accountData?.account, currentPage, getAccessToken]);



  const trackWallet = async (accountData: AccountData) => {
    setIsTrackLoading(true);
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/tools/track-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          walletAddress: accountData.account,
          userId: user?.id,
          filters: trackingOptions.filters,
          name: trackingOptions.name.trim() || null,
          tags: trackingOptions.tags.length > 0 ? trackingOptions.tags : null
        })
      });
      
      if (!response.ok) throw new Error('Failed to start tracking');
      setIsTracked(true);
      toast.success('Wallet tracking started successfully');
    } catch (error) {
      console.error('Error tracking wallet:', error);
      setError('Failed to start tracking wallet');
      toast.error('Failed to track wallet');
    }
    setIsTrackLoading(false);
  };

  // Handle error cases in render
  if (!("result" in toolInvocation)) {
    return null;
  }

  if (toolInvocation.result && "error" in toolInvocation.result) {
    return (
      <div className="p-4 bg-zinc-800 rounded-lg">
        <div className="text-zinc-400 flex items-center gap-2">
          {toolInvocation.result.error}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl bg-zinc-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-zinc-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">Wallet Details</h2>
        <div className="flex items-center gap-4">
          {isTracked ? (
            <div className="flex items-center gap-2 text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              <span>Wallet Tracked</span>
            </div>
          ) : (
            <button
              onClick={() => setIsTrackModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              Track Wallet
            </button>
          )}
        </div>
      </div>

      {/* Tracking Filters */}
      {trackingOptions.showFilters && !isTracked && (
        <div className="p-6 border-t border-zinc-700 bg-zinc-900">
          <div className="grid grid-cols-1 gap-6">
            {/* Wallet Identity Section */}
            <div>
              <h3 className="text-sm font-medium text-white mb-4">Wallet Identity</h3>
              
              {/* Wallet Name */}
              <div className="space-y-2 mb-4">
                <label className="text-sm text-zinc-400">Wallet Name (Optional)</label>
                <input
                  type="text"
                  value={trackingOptions.name}
                  onChange={(e) => setTrackingOptions(prev => ({...prev, name: e.target.value}))}
                  placeholder={`Wallet ${accountData?.account?.slice(0, 4)}...${accountData?.account?.slice(-4)}`}
                  className="w-full px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              
              {/* Tags */}
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Tags (Optional)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {trackingOptions.tags.map(tag => (
                    <div key={tag} className="bg-indigo-900/50 text-indigo-200 px-2 py-1 rounded-md flex items-center text-sm">
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-indigo-300 hover:text-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    value={trackingOptions.tagInput}
                    onChange={handleTagInputChange}
                    onKeyDown={handleTagInputKeyDown}
                    onBlur={addTag}
                    placeholder="Add tags (press Enter or comma to add)"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Tags help you organize and search for wallets
                </p>
              </div>
            </div>
            
            {/* Alert Settings Section */}
            <div>
              <h3 className="text-sm font-medium text-white mb-4">Alert Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Minimum Amount Filter */}
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Minimum Amount (USD)</label>
                  <input
                    type="number"
                    min="0"
                    value={trackingOptions.filters.minAmount}
                    onChange={(e) => handleFilterChange('minAmount', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-zinc-500">
                    Only alert for transactions above this amount
                  </p>
                </div>

                {/* Specific Token Filter */}
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Specific Token Address (Optional)</label>
                  <input
                    type="text"
                    value={trackingOptions.filters.specificToken}
                    onChange={(e) => handleFilterChange('specificToken', e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Enter token address"
                  />
                  <p className="text-xs text-zinc-500">
                    Only alert for transactions involving this token
                  </p>
                </div>
              </div>

              {/* Activity Types Filter */}
              <div className="space-y-2 mt-4">
                <label className="text-sm text-zinc-400">Activity Types</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { value: 'ACTIVITY_TOKEN_SWAP', label: 'Token Swap' },
                    { value: 'ACTIVITY_AGG_TOKEN_SWAP', label: 'Aggregator Token Swap' },
                    { value: 'ACTIVITY_TOKEN_ADD_LIQ', label: 'Add Liquidity' },
                    { value: 'ACTIVITY_TOKEN_REMOVE_LIQ', label: 'Remove Liquidity' }
                  ].map(({ value, label }) => (
                    <label key={value} className="flex items-center space-x-2 px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700 hover:bg-zinc-750">
                      <input
                        type="checkbox"
                        checked={trackingOptions.filters.activityTypes?.includes(value)}
                        onChange={(e) => {
                          const types = e.target.checked
                            ? [...(trackingOptions.filters.activityTypes || []), value]
                            : (trackingOptions.filters.activityTypes || []).filter(t => t !== value);
                          handleFilterChange('activityTypes', types);
                        }}
                        className="form-checkbox h-4 w-4 text-indigo-600 rounded border-zinc-500 bg-zinc-700"
                      />
                      <span className="text-sm text-zinc-300">{label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Select which activity types to receive alerts for
                </p>
              </div>

            </div>
          </div>
        </div>
      )}      


      {/* Account Info Content */}
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Account Address */}
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-400">Account Address</div>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white break-all truncate max-w-[180px]">
                {accountData ? accountData.account : 'N/A'}
              </div>
              <CopyButton text={accountData?.account || ''}/>
            </div>
          </div>

          {/* Balance */}
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-400">Balance</div>
            <div className="text-lg font-semibold text-white flex gap-2 items-center">
              <div><Image src="http://d1olseq3j3ep4p.cloudfront.net/images/chains/solana.svg" alt="SOL" width={15} height={15}/></div>
              <div>{accountData ? formatSolBalance(accountData.lamports) : '0'} SOL</div>
            </div>
          </div>
        </div>

        {/* Activities Section */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activities</h3>
          
          {isLoading ? (
            <div className="text-center py-4">
              <LoadingIndicator />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-500 p-4">
              <AlertCircleIcon />
              <span>{error}</span>
            </div>
          ) : activities?.data && activities.data.length > 0 ? (
            <div className="space-y-3">
              {activities.data.map((activity, index) => {
                const token1 = activities.metadata.tokens[activity.routers.token1];
                const token2 = activities.metadata.tokens[activity.routers.token2];

                return (
                  <div 
                    key={index}
                    className="border border-zinc-900 p-4 bg-zinc-900 rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-white">
                        {activity.activity_type.replace('ACTIVITY_', '')}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {new Date(activity.time).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <img 
                            src={token1?.token_icon} 
                            alt={token1?.token_symbol} 
                            className="w-5 h-5 rounded-full"
                          />
                          <span className="text-sm text-white">
                            {formatAmount(activity.routers.amount1, activity.routers.token1_decimals)} {token1?.token_symbol}
                          </span>
                        </div>
                        <span className="text-zinc-500">→</span>
                        <div className="flex items-center gap-2">
                          <img 
                            src={token2?.token_icon} 
                            alt={token2?.token_symbol} 
                            className="w-5 h-5 rounded-full"
                          />
                          <span className="text-sm text-white">
                            {formatAmount(activity.routers.amount2, activity.routers.token2_decimals)} {token2?.token_symbol}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-white">
                        ${activity.value.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
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
                  disabled={!activities?.data || activities.data.length < PAGE_SIZE}
                  className="px-3 py-1 rounded bg-zinc-700 text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-600 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-zinc-400 py-8">
              No activities found
            </div>
          )}
        </div>
      </div>

      {accountData && (
        <TrackWalletModal
          isOpen={isTrackModalOpen}
          onClose={() => setIsTrackModalOpen(false)}
          onSuccess={handleTrackSuccess}
          walletAddress={accountData.account}
          userId={user?.id || ''}
        />
      )}


    </div>
  );
};

export default AccountInfo;