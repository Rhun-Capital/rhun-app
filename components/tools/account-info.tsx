import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import { AlertCircleIcon } from '@/components/icons';
import LoadingIndicator from '@/components/loading-indicator';

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
  // All hooks at the top
  const { getAccessToken, user } = usePrivy();
  const [activities, setActivities] = useState<ActivityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTrackLoading, setIsTrackLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTracked, setIsTracked] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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
          userId: user?.id
        })
      });
      
      if (!response.ok) throw new Error('Failed to start tracking');
      // You might want to show a success message here
    } catch (error) {
      console.error('Error tracking wallet:', error);
      // You might want to show an error message here
    }
    setIsTracked(true);    
    setIsTrackLoading(false);
  }


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
        <h2 className="text-lg font-semibold text-white">Account Details</h2>
        {accountData && !isTracked  && (
          <button
            disabled={isTrackLoading}
            onClick={() => accountData && trackWallet(accountData)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <div>{isTrackLoading ? 'Tracking Wallet...' : 'Track Wallet'}</div>
          </button>
        )}
        {isTracked && (
          <div className="px-4 py-2 bg-zinc-700 text-green-400 rounded-lg text-sm">
            <div>Wallet Tracked</div>
          </div>
        )}
      </div>

      {/* Account Info Content */}
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Account Address */}
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-400">Account Address</div>
            <div className="text-sm font-semibold text-white break-all">
              {accountData ? accountData.account : 'N/A'}
            </div>
          </div>

          {/* Balance */}
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-400">Balance</div>
            <div className="text-lg font-semibold text-white flex gap-2 items-center">
              <div><Image src="/images/chains/solana.svg" alt="SOL" width={15} height={15}/></div>
              <div>{accountData ? formatSolBalance(accountData.lamports) : '0'} SOL</div>
            </div>
          </div>
        </div>

        {/* Activities Section */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
          
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
                          <img 
                            src={token1?.token_icon} 
                            alt={token1?.token_symbol} 
                            className="w-5 h-5 rounded-full"
                          />
                          <span className="text-sm">
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
    </div>
  );
};

export default AccountInfo;