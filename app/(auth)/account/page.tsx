// app/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {useSolanaWallets} from '@privy-io/react-auth/solana';
import { AlertCircleIcon, ChevronUpIcon, ChevronDownIcon } from "@/components/icons";
import { useMfaEnrollment } from '@privy-io/react-auth';
import CopyButton from "@/components/copy-button";
import SubscriptionManagement from "@/components/manage-subscription";
import { useSearchParams } from 'next/navigation';
import {useRouter} from 'next/navigation';

export default function SettingsPage() {
  const { user, logout, authenticated, getAccessToken } = usePrivy();
  const { exportWallet, createWallet } = useSolanaWallets();
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [showSubscriptionBanner, setShowSubscriptionBanner] = useState(false);
  const searchParams = useSearchParams();
  const [exportLoading, setExportLoading] = useState(false);
  const [isAdvancedOptionsOpen, setIsAdvancedOptionsOpen] = useState(false);  
  const router = useRouter();

  //   looks for wallet creation on the user
  useEffect(() => {
    if (user?.wallet?.address) {
      setWalletLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Check for requiresSub query parameter
    const requiresSub = searchParams.get('requiresSub');
    
    if (requiresSub === 'true') {
      scrollTo(0, 0);
      setShowSubscriptionBanner(true);
      
      // Remove the query parameter from the URL
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('requiresSub');
      window.history.replaceState({}, '', currentUrl.toString());
    }
  }, [searchParams]);

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
    router.push('/login');
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

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-zinc-900 text-gray-100 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="p-4 sm:p-6 bg-red-900/50 border border-red-500 rounded-lg flex items-center gap-2 text-sm sm:text-base">
            <AlertCircleIcon />
            <p>Please connect your wallet to access settings.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-gray-100">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {showSubscriptionBanner && (
          <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg mb-6">
            <div className="flex items-center gap-2">
              <AlertCircleIcon />
              <p>A subscription is required to access this feature. Start your subscription below.</p>
            </div>
          </div>
        )}

        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Account</h1>

        <div className="space-y-6 sm:space-y-8">
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
          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Subscription</h2>
            <div className="bg-zinc-800 rounded-lg p-4 sm:p-6">            
              <SubscriptionManagement wallet={user?.wallet?.address || ''} userId={user?.id || ''}/>
            </div>
          </section>

          {/* Connected Wallets */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Connected Wallets</h2>
            <div className="bg-zinc-800 rounded-lg p-4 sm:p-6">
              {user?.wallet?.address ? (
                <div>
                  <label className="block text-xs sm:text-sm text-zinc-400 mb-1 sm:mb-2">Primary Wallet</label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="min-w-0">
                      <pre className="text-xs sm:text-sm break-all overflow-x-auto">{user.wallet.address}</pre>
                    </div>
                    <CopyButton text={user.wallet.address}/>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm sm:text-base text-zinc-400">No wallets connected</p>
                  <div className="p-6 bg-zinc-800 rounded-lg">
                  <button
                    onClick={handleCreateWallet}
                    disabled={walletLoading}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg transition disabled:opacity-50"
                  >
                    {walletLoading ? 'Creating Wallet...' : 'Create Wallet'}
                  </button>
                </div>                  
                </div>
              )}

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
                          {exportLoading ? 'Exporting...' : 'Export Wallet'}
                        </button>
                        <p className="text-xs text-zinc-400 mt-2">
                          Export your wallet private key. Use with caution.
                        </p>
                      </div>
                    </div>
                  )}
                </div>


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
    </div>
  );
}