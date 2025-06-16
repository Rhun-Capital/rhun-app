// app/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { usePrivy, useLogin } from "@privy-io/react-auth";
import {useSolanaWallets} from '@privy-io/react-auth/solana';
import { AlertCircleIcon, ChevronUpIcon, ChevronDownIcon } from "@/components/icons";
import { useMfaEnrollment } from '@privy-io/react-auth';
import CopyButton from "@/components/copy-button";
import { SubscriptionManagement } from "@/components/manage-subscription";
import { useSearchParams } from 'next/navigation';
import {useRouter} from 'next/navigation';
import { useSubscription } from "@/hooks/use-subscription";
import { ApiKeyManagement } from "@/components/api-key-management";
import { ErrorBoundary } from '@/components/error-boundary';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useFundWallet } from '@privy-io/react-auth/solana';
import FundingModal from '@/components/funding-amount-modal';

export default function SettingsPage() {
  return (
    <ErrorBoundary>
      <AccountPageContent />
    </ErrorBoundary>
  );
}

function AccountPageContent() {
  const { user, logout, authenticated, getAccessToken } = usePrivy();
  const { login } = useLogin();
  const { exportWallet, createWallet } = useSolanaWallets();
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  // const [showSubscriptionBanner, setShowSubscriptionBanner] = useState(false);
  // const searchParams = useSearchParams();
  const [exportLoading, setExportLoading] = useState(false);
  const [isAdvancedOptionsOpen, setIsAdvancedOptionsOpen] = useState(false);  
  const router = useRouter();
  const [walletBalances, setWalletBalances] = useState<any[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [totalUsdValue, setTotalUsdValue] = useState(0);
  const [showFundingModal, setShowFundingModal] = useState(false);
  const { fundWallet } = useFundWallet();  
  const { 
      isLoading, 
      error: subscriptionError, 
      subscriptionType,
      subscriptionDetails,
      isSubscribed  
    } = useSubscription();

  //   looks for wallet creation on the user
  useEffect(() => {
    if (user?.wallet?.address) {
      setWalletLoading(false);
      fetchWalletBalances();
    }
  }, [user]);

  const fetchWalletBalances = async () => {
    if (!user?.wallet?.address) return;
    
    try {
      setBalanceLoading(true);
      console.log('Fetching wallet balances for:', user.wallet.address);
      
      const response = await fetch(`/api/wallets/${user.wallet.address}/tokens`);
      const data = await response.json();
      
      console.log('Wallet balances API response:', data);
      
      if (response.ok && data.success && data.data) {
        // Filter out tokens with zero balance and sort by value
        const filteredBalances = data.data
          .filter((token: any) => token.formatted_amount > 0)
          .sort((a: any, b: any) => (b.usd_value || 0) - (a.usd_value || 0));
        
        // Calculate total USD value
        const total = filteredBalances.reduce((sum: number, token: any) => {
          return sum + (token.usd_value || 0);
        }, 0);
        
        setWalletBalances(filteredBalances);
        setTotalUsdValue(total);
        console.log('Set wallet balances:', filteredBalances);
        console.log('Total USD value:', total);
      } else {
        console.log('API response not successful or no data');
        setWalletBalances([]);
        setTotalUsdValue(0);
      }
    } catch (error) {
      console.error('Error fetching wallet balances:', error);
      setWalletBalances([]);
      setTotalUsdValue(0);
    } finally {
      setBalanceLoading(false);
    }
  };

  // useEffect(() => {
  //   // Check for requiresSub query parameter
  //   const requiresSub = searchParams.get('requiresSub');
    
  //   if (requiresSub === 'true') {
  //     scrollTo(0, 0);
  //     setShowSubscriptionBanner(true);
      
  //     // Remove the query parameter from the URL
  //     const currentUrl = new URL(window.location.href);
  //     currentUrl.searchParams.delete('requiresSub');
  //     window.history.replaceState({}, '', currentUrl.toString());
  //   }
  // }, [searchParams]);

  function MfaEnrollmentButton() {
    const {showMfaEnrollmentModal} = useMfaEnrollment();
    return <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition" onClick={showMfaEnrollmentModal}>Enroll in MFA</button>;
  }  

  const clearCookies = async () => {
    const accessToken = await getAccessToken();
    await fetch('/api/auth/clear-access', { method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}` } });
  }  

  const handleLogout = async () => {
    setLoading(true);
    await clearCookies(); // Clear access tokens
    await logout(); // Clear Privy state
    router.push('/');
  }  
  
  const handleCreateWallet = async () => {
    try {
      setWalletLoading(true);
      const wallet = await createWallet({walletIndex: 0});
    } catch (error) {
      console.error('Error creating wallet:', error);
    } finally {
      setWalletLoading(false);
    }
  };  

  const toggleAdvancedOptions = () => {
    setIsAdvancedOptionsOpen(!isAdvancedOptionsOpen);
  }  

  const handleExportWallet = async () => {
    setExportLoading(true);
    try {
      const wallet = user?.wallet;
      if (wallet) {
        await exportWallet(wallet);
      }
    } catch (error) {
      console.error('Error exporting wallet:', error);
    } finally {
      setExportLoading(false);
    }
  }

  const handleFundingConfirm = async (amount: number) => {
    if (user?.wallet?.address) {
      try {
        await fundWallet(user.wallet.address, {
          amount: amount.toString(),
        });
        setShowFundingModal(false);
        // Refresh wallet balances after funding
        fetchWalletBalances();
      } catch (error) {
        console.error('Error funding wallet:', error);
      }
    }
  };  

  if (!authenticated) {
    return (
      <div className="h-screen bg-zinc-900 text-gray-100 p-4 sm:p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Account</h1>
          <div className="text-sm text-zinc-400 mb-8">Connect wallet to access your account settings</div>
          
          <div className="bg-zinc-800 rounded-lg border border-zinc-700">
            <div className="p-6">
              <div className="text-center py-8">
                <div className="flex justify-center mb-4">
                  <div className="flex items-center -space-x-2">
                    <div className="w-12 h-12 bg-zinc-700 rounded-full border-2 border-zinc-600 flex items-center justify-center">
                      <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="w-12 h-12 bg-zinc-700 rounded-full border-2 border-zinc-600 flex items-center justify-center">
                      <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="text-zinc-300 mb-2 font-medium">No wallet connected</div>
                <div className="text-zinc-500 text-sm mb-6">
                  Connect your wallet to access account settings and manage your portfolio
                </div>
                <button
                  onClick={login}
                  className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold transition-colors"
                >
                  Connect Wallet
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-900 text-gray-100 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 w-full pb-20 sm:pb-6">
        {/* {showSubscriptionBanner && (
          <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg mb-6">
            <div className="flex items-center gap-2">
              <AlertCircleIcon />
              <p>A subscription is required to access this feature. Start your subscription below.</p>
            </div>
          </div>
        )} */}

                <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center sm:text-left">Account</h1>

        <div className="space-y-6 sm:space-y-8">
          {/* Wallet & Balances */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Wallet & Balances</h2>
            <div className="bg-zinc-800 rounded-lg p-4 sm:p-6 space-y-6">
              {user?.wallet?.address ? (
                <>
                  {/* Wallet Address */}
                  <div>
                    <label className="block text-xs sm:text-sm text-zinc-400 mb-1 sm:mb-2">Primary Wallet</label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="w-full min-w-0 overflow-hidden">
                        <pre className="text-xs sm:text-sm break-all overflow-x-auto whitespace-normal">{user.wallet.address}</pre>
                      </div>
                      <CopyButton text={user.wallet.address}/>
                    </div>
                  </div>

                  {/* Portfolio Value & Balances */}
                  {balanceLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                      <span className="ml-2 text-zinc-400">Loading balances...</span>
                    </div>
                  ) : walletBalances.length > 0 ? (
                    <div className="space-y-4">
                      {/* Total Portfolio Value */}
                      <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-700">
                        <div className="text-sm text-zinc-400 mb-1">Total Portfolio Value</div>
                        <div className="text-2xl font-bold text-white">
                          ${totalUsdValue.toLocaleString('en-US', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </div>
                      </div>

                      {/* Token List */}
                      <div className="space-y-3">
                        {walletBalances.map((token, index) => {
                          const TokenIcon = () => {
                            if (token.token_icon || token.token_logo) {
                              const logoUrl = token.token_icon || token.token_logo;
                              return (
                                <div className="relative">
                                  <Image 
                                    src={logoUrl} 
                                    alt={token.token_symbol || 'Token'} 
                                    width={40}
                                    height={40}
                                    className="rounded-full border-2 border-zinc-700"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const fallback = target.parentElement?.querySelector('.fallback-icon') as HTMLElement;
                                      if (fallback) fallback.style.display = 'flex';
                                    }}
                                  />
                                  <div 
                                    className="fallback-icon w-10 h-10 bg-zinc-700 rounded-full border-2 border-zinc-600 items-center justify-center absolute top-0 left-0"
                                    style={{ display: 'none' }}
                                  >
                                    <span className="text-white text-sm font-bold">
                                      {(token.token_symbol || 'T').charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                              );
                            }
                            
                            return (
                              <div className="w-10 h-10 bg-zinc-700 rounded-full border-2 border-zinc-600 flex items-center justify-center">
                                <span className="text-white text-sm font-bold">
                                  {(token.token_symbol || 'T').charAt(0).toUpperCase()}
                                </span>
                              </div>
                            );
                          };

                          return (
                            <div key={token.token_address || index} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
                              <div className="flex items-center gap-3">
                                <TokenIcon />
                                <div>
                                  <div className="font-medium text-white">
                                    {token.token_symbol || 'Unknown Token'}
                                  </div>
                                  <div className="text-xs text-zinc-400">
                                    {token.token_name || 'Unknown'}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-white">
                                  {token.formatted_amount?.toLocaleString('en-US', { 
                                    minimumFractionDigits: 2, 
                                    maximumFractionDigits: 6 
                                  }) || '0.00'}
                                </div>
                                {token.usd_value && (
                                  <div className="text-xs text-zinc-400">
                                    ${token.usd_value.toLocaleString('en-US', { 
                                      minimumFractionDigits: 2, 
                                      maximumFractionDigits: 2 
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                       </div>
                       
                       <div className="pt-4 border-t border-zinc-700 flex flex-col sm:flex-row gap-3">
                         <button
                           onClick={() => setShowFundingModal(true)}
                           className="w-full sm:w-auto px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg transition text-sm"
                         >
                           Add Funds
                         </button>
                         
                         <button
                           onClick={fetchWalletBalances}
                           disabled={balanceLoading}
                           className="w-full sm:w-auto px-4 py-2 border border-indigo-400 text-indigo-400 hover:bg-indigo-400/20 rounded-lg transition disabled:opacity-50 text-sm"
                         >
                           {balanceLoading ? (
                             <>
                               <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                               Refreshing...
                             </>
                           ) : (
                             'Refresh Balances'
                           )}
                         </button>
                       </div>
                     </div>
                   ) : (
                     <div className="text-center py-8">
                       <p className="text-zinc-400 mb-4">No token balances found</p>
                       <button
                         onClick={fetchWalletBalances}
                         disabled={balanceLoading}
                         className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg transition disabled:opacity-50 text-sm"
                       >
                         {balanceLoading ? (
                           <>
                             <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                             Loading...
                           </>
                         ) : (
                           'Load Balances'
                         )}
                       </button>
                     </div>
                   )}

                  {/* Advanced Options */}
                  <div className="pt-4 border-t border-zinc-700">
                    <button 
                      onClick={toggleAdvancedOptions}
                      className="w-full flex justify-between items-center text-sm font-medium text-zinc-300 hover:text-zinc-100 transition"
                    >
                      <span>Advanced Options</span>
                      {isAdvancedOptionsOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    </button>

                    {isAdvancedOptionsOpen && (
                      <div className="mt-4 space-y-4 bg-zinc-900 rounded-lg p-4">
                        <div>
                          <button
                            onClick={handleExportWallet}
                            disabled={exportLoading}
                            className="px-10 py-1 text-white outline outline-orange-600 hover:opacity-70  rounded-md transition disabled:opacity-50"
                          >
                            {exportLoading ? "Exporting..." : "Export Wallet"}
                          </button>
                          <p className="text-xs text-zinc-400 mt-2">
                            Export your wallet private key. Use with caution.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-sm sm:text-base text-zinc-400">No wallets connected</p>
                  <div className="p-6 bg-zinc-800 rounded-lg">
                    <button
                      onClick={handleCreateWallet}
                      disabled={walletLoading}
                      className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg transition disabled:opacity-50"
                    >
                      {walletLoading ? "Creating Wallet..." : "Create Wallet"}
                    </button>
                  </div>                  
                </div>
              )}
            </div>
          </section>

          {/* Profile Section */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Profile</h2>
            <div className="bg-zinc-800 rounded-lg p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div>
                <label className="block text-xs sm:text-sm text-zinc-400 mb-1 sm:mb-2">Email</label>
                <p className="text-sm sm:text-base font-medium break-all">{user?.email?.address || "No email set"}</p>
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-zinc-400 mb-1 sm:mb-2">User ID</label>
                <p className="text-sm sm:text-base font-medium break-all">{user?.id}</p>
              </div>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full sm:w-auto py-2 bg-transparent text-red-500 rounded-lg transition disabled:opacity-50"
              >
                {loading ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          </section>

          {/* Subscriptions */}
          {isSubscribed && <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Subscription</h2>
            <div className="bg-zinc-800 rounded-lg p-4 sm:p-6">            
              <SubscriptionManagement wallet={user?.wallet?.address || ''} userId={user?.id || ''}/>
            </div>
          </section> }

          {/* API Keys */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">API Keys</h2>
            <div className="bg-zinc-800 rounded-lg p-4 sm:p-6">
              <ApiKeyManagement />
            </div>
          </section>

          {/* Security Settings */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Security</h2>
            <div className="bg-zinc-800 rounded-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm sm:text-base font-medium">Two-Factor Authentication</p>
                  <p className="text-xs sm:text-sm text-zinc-400">Add an extra layer of security</p>
                </div>
                <MfaEnrollmentButton />
              </div>
            </div>
          </section>
        </div>
      </div>
      
      {/* Funding Modal */}
      <FundingModal
        isOpen={showFundingModal}
        onClose={() => setShowFundingModal(false)}
        onConfirm={handleFundingConfirm}
        defaultAmount={0.1}
      />
    </div>
  );
}