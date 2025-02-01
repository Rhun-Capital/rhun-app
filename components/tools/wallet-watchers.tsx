'use client';

import React, { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import Image from 'next/image';
import { AlertCircleIcon, CloseIcon } from '@/components/icons';
import LoadingIndicator from '@/components/loading-indicator';

interface TokenMetadata {
  token_name: string;
  token_icon: string;
  token_address: string;
  token_symbol: string;
}

interface RouterDetails {
  amount1: number | string;
  amount2: number | string;
  token1: string;
  token2: string;
  token1_decimals?: number;
  token2_decimals?: number;
  child_routers?: RouterDetails[];
  program_address?: string;
  pool_address?: string;
}

interface SwapActivity {
  block_time: number;
  sources?: string[];
  activity_type: string;
  trans_id: string;
  time: string;
  from_address: string;
  value: number;
  routers: RouterDetails;
  block_id: number;
  platform: string[];
}

interface LastActivityWrapper {
  metadata: {
    tokens: {
      [key: string]: TokenMetadata;
    };
  };
  latestActivity: SwapActivity[];
  userId: string;
  timestamp: string;
  sk: string;
  pk: string;
  walletAddress: string;
  type: string;
}

interface WatcherData {
  walletAddress: string;
  userId: string;
  createdAt: string;
  isActive: boolean;
  sk: string;
  pk: string;
  type: string;
  lastDataPoint?: {
    solBalance: number;
    timestamp: string;
  };
  lastActivity?: LastActivityWrapper[];
}

interface WatchersResponse {
  watchers: WatcherData[];
}

const WalletWatchers = () => {
  const { getAccessToken, user, ready } = usePrivy();
  const [watchers, setWatchers] = useState<WatcherData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWatcher, setSelectedWatcher] = useState<WatcherData | null>(null);

  const fetchWatchers = async () => {
    try {
      if (!ready) return;
      if (!user && ready) throw new Error('User not found');
      const token = await getAccessToken();
      const response = await fetch(`/api/watchers?userId=${encodeURIComponent(user?.id || '')}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch watchers');
      const responseData: WatchersResponse = await response.json();
      
      setWatchers(responseData.watchers);
    } catch (error) {
      setError('Failed to load wallet watchers');
      console.error('Error fetching watchers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id)
      fetchWatchers();
  }, [user]);

  // Get the most recent activities
  const getMostRecentActivities = (activityWrapper?: LastActivityWrapper[]) => {
    if (!activityWrapper || activityWrapper.length === 0) return [];
    
    // Get the latestActivity array from the first activity wrapper
    const activities = activityWrapper[0].latestActivity || [];
    
    // Sort activities by time in descending order
    return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  };

  // Format token swap details
  const formatTokenSwapDetails = (
    activity: SwapActivity, 
    tokens: { [key: string]: TokenMetadata }
  ) => {
    const primaryRouter = activity.routers;
    const childRouter = primaryRouter.child_routers?.[0];

    return {
      token1: {
        address: childRouter?.token1 || primaryRouter.token1,
        amount: childRouter?.amount1 || primaryRouter.amount1,
        decimals: childRouter?.token1_decimals || primaryRouter.token1_decimals,
        metadata: tokens[childRouter?.token1 || primaryRouter.token1]
      },
      token2: {
        address: childRouter?.token2 || primaryRouter.token2,
        amount: childRouter?.amount2 || primaryRouter.amount2,
        decimals: childRouter?.token2_decimals || primaryRouter.token2_decimals,
        metadata: tokens[childRouter?.token2 || primaryRouter.token2]
      }
    };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingIndicator />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-zinc-800 rounded-lg">
        <div className="text-zinc-400 flex items-center gap-2">
          <AlertCircleIcon />
          {error}
        </div>
      </div>
    );
  }

  if (watchers.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Wallet Watchers</h1>      
        <div className="p-4 bg-zinc-800 rounded-lg">
          <div className="text-zinc-400 flex items-center gap-2">
            <AlertCircleIcon />
            No watchers found
          </div>
        </div>
      </div>
    );
  }  

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Wallet Watchers</h1>
      
      <div className="space-y-4">
        {watchers.map((watcher) => {
          const mostRecentActivities = getMostRecentActivities(watcher.lastActivity);
          return (
            <div
              key={watcher.walletAddress}
              onClick={() => setSelectedWatcher(watcher)}
              className={`p-4 bg-zinc-800 rounded-lg cursor-pointer transition-all
                hover:bg-zinc-700 ${selectedWatcher?.walletAddress === watcher.walletAddress ? 'ring-2 ring-indigo-500' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-white">
                  {`Wallet ${watcher.walletAddress.slice(0, 4)}...${watcher.walletAddress.slice(-4)}`}
                </div>
                <div className={`text-sm ${watcher.isActive ? 'text-green-500' : 'text-red-500'}`}>
                  {watcher.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
              
              {watcher.lastDataPoint && (
                <div className="text-sm text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Image src="/images/chains/solana.svg" alt="SOL" width={12} height={12}/>
                    <span>{watcher.lastDataPoint.solBalance.toFixed(4)} SOL</span>
                  </div>
                  <div className="text-xs mt-1 mb-1">
                    Last updated: {new Date(watcher.lastDataPoint.timestamp).toLocaleString()}
                  </div>
                  <div className="text-sm text-indigo-500">
                    View Details
                  </div>                
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detailed Watcher Modal */}
      {selectedWatcher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-zinc-700">
              <h2 className="text-xl font-semibold text-white">
                {`Wallet ${selectedWatcher.walletAddress.slice(0, 4)}...${selectedWatcher.walletAddress.slice(-4)}`}
              </h2>
              <button 
                onClick={() => setSelectedWatcher(null)}
                className="text-zinc-400 hover:text-white"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Wallet Address */}
              <p className="text-sm text-zinc-400 font-mono mb-6">
                {selectedWatcher.walletAddress}
              </p>

              {/* Wallet Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-zinc-900 p-4 rounded-lg">
                  <div className="text-sm text-zinc-400">Tracking Since</div>
                  <div className="text-white">
                    {new Date(selectedWatcher.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="bg-zinc-900 p-4 rounded-lg">
                  <div className="text-sm text-zinc-400">Current Balance</div>
                  <div className="text-white flex items-center gap-2">
                    <Image src="/images/chains/solana.svg" alt="SOL" width={16} height={16}/>
                    {selectedWatcher.lastDataPoint?.solBalance.toFixed(4)} SOL
                  </div>
                </div>
              </div>
              
              {/* Recent Activity */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                {selectedWatcher.lastActivity && selectedWatcher.lastActivity.length > 0 ? (
                  getMostRecentActivities(selectedWatcher.lastActivity).slice(0, 3).map((activity, index) => {
                    const tokens = selectedWatcher.lastActivity?.[0]?.metadata?.tokens || {};
                    const tokenDetails = formatTokenSwapDetails(activity, tokens);
                    return (
                      <div 
                        key={index}
                        className="border border-zinc-900 p-4 bg-zinc-900 rounded-lg mb-4"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium">
                            {activity.activity_type?.replace('ACTIVITY_', '') || 'Token Swap'}
                          </span>
                          <span className="text-xs text-zinc-400">
                            {new Date(activity.time).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {tokenDetails.token1.metadata?.token_icon && (
                                <img 
                                  src={tokenDetails.token1.metadata.token_icon} 
                                  alt={tokenDetails.token1.metadata.token_symbol} 
                                  className="w-5 h-5 rounded-full"
                                />
                              )}
                              <span className="text-sm">
                                {(Number(tokenDetails.token1.amount) / Math.pow(10, tokenDetails.token1.decimals || 1)).toFixed(4)} 
                                {tokenDetails.token1.metadata?.token_symbol || tokenDetails.token1.address}
                              </span>
                            </div>
                            <span className="text-zinc-500">→</span>
                            <div className="flex items-center gap-2">
                              {tokenDetails.token2.metadata?.token_icon && (
                                <img 
                                  src={tokenDetails.token2.metadata.token_icon} 
                                  alt={tokenDetails.token2.metadata.token_symbol} 
                                  className="w-5 h-5 rounded-full"
                                />
                              )}
                              <span className="text-sm">
                                {(Number(tokenDetails.token2.amount) / Math.pow(10, tokenDetails.token2.decimals || 1)).toFixed(4)} 
                                {tokenDetails.token2.metadata?.token_symbol || tokenDetails.token2.address}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-zinc-400">
                            ${activity.value.toFixed(2)}
                          </div>
                        </div>

                        <div className="mt-2 text-xs text-zinc-500 truncate">
                          Platform: {activity.platform.join(', ')}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500 truncate">
                          Transaction ID: {activity.trans_id}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-zinc-400 py-8">
                    No recent activities found
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletWatchers;