// app/settings/page.tsx
"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { AlertCircleIcon } from "@/components/icons";
import {useMfaEnrollment} from '@privy-io/react-auth';
import CopyButton from "@/components/copy-button";
import SubscriptionManagement  from "@/components/manage-subscription";

export default function SettingsPage() {
  const { user, logout, authenticated } = usePrivy();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Theme preference (you can expand this)
  const [darkMode, setDarkMode] = useState(true);

  // Notification preferences
  const [notifications, setNotifications] = useState<{ [key: string]: boolean }>({
    portfolio: true,
    security: true,
    marketing: false
  });

  function MfaEnrollmentButton() {
    const {showMfaEnrollmentModal} = useMfaEnrollment();
    return <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition" onClick={showMfaEnrollmentModal}>Enroll in MFA</button>;
  }  

const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
};

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Settings</h1>

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
            <SubscriptionManagement  userId={user?.id || ''}/>
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
              <p className="text-sm sm:text-base text-zinc-400">No wallets connected</p>
            )}
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