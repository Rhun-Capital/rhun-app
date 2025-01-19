// app/settings/page.tsx
"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { AlertCircleIcon, WalletIcon, MegaphoneIcon, LockIcon, GlobeIcon, CopyIcon } from "@/components/icons";
import {useMfaEnrollment} from '@privy-io/react-auth';

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
      <div className="min-h-screen bg-zinc-900 text-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="p-6 bg-red-900/50 border border-red-500 rounded-lg flex items-center gap-2">
            <AlertCircleIcon />
            <p>Please connect your wallet to access settings.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-gray-100">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        {/* Profile Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Profile</h2>
          <div className="bg-zinc-800 rounded-lg p-6 space-y-6">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Email</label>
              <p className="font-medium">{user?.email?.address || "No email set"}</p>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">User ID</label>
              <p className="font-medium">{user?.id}</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loading}
              className=" py-2 bg-transparent text-red-500 rounded-lg transition disabled:opacity-50"
            >
              {loading ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>

        {/* Connected Wallets */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            {/* <WalletIcon /> */}
            <h2 className="text-xl font-semibold">Connected Wallets</h2>
          </div>
          <div className="bg-zinc-800 rounded-lg p-6">
            {user?.wallet?.address ? (
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Primary Wallet</label>
                <div className="flex items-center justify-between">
                  <pre className="text-sm">{user.wallet.address}</pre>
                  <button
                    className="text-sm text-indigo-400 hover:text-indigo-300"
                    onClick={() => {
                      if (user?.wallet?.address) {
                        copyToClipboard(user.wallet.address);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }
                    }}
                  >
                    {copied ? (
                      <span className="text-green-400">Copied!</span>
                    ) : (
                      <span>Copy</span>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-zinc-400">No wallets connected</p>
            )}
          </div>
        </div>

        {/* Security Settings */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            {/* <LockIcon /> */}
            <h2 className="text-xl font-semibold">Security</h2>
          </div>
          <div className="bg-zinc-800 rounded-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-zinc-400">Add an extra layer of security</p>
              </div>
              <MfaEnrollmentButton/>
            </div>
            {/* <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Transaction Signing</p>
                <p className="text-sm text-zinc-400">Require confirmation for all transactions</p>
              </div>
              <button className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition">
                Configure
              </button>
            </div> */}
          </div>
        </div>

        {/* Preferences */}
        {/* <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <GlobeIcon/>
            <h2 className="text-xl font-semibold">Preferences</h2>
          </div>
          <div className="bg-zinc-800 rounded-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-zinc-400">Toggle dark mode theme</p>
              </div>
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${darkMode ? 'bg-indigo-500' : 'bg-zinc-700'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div> 
             <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Default Currency</p>
                <p className="text-sm text-zinc-400">Set your preferred currency</p>
              </div>
              <select className="bg-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
        </div> */}

        {/* Notifications */}
        {/* <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <MegaphoneIcon/>
            <h2 className="text-xl font-semibold">Notifications</h2>
          </div>
          <div className="bg-zinc-800 rounded-lg p-6 space-y-6">
            {Object.entries(notifications).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium capitalize">{key}</p>
                  <p className="text-sm text-zinc-400">
                    Receive {key} notifications
                  </p>
                </div>
                <button 
                  onClick={() => setNotifications(prev => ({ ...prev, [key]: !prev[key as keyof typeof notifications] }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${enabled ? 'bg-indigo-500' : 'bg-zinc-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            ))}
          </div>
        </div> */}

        {/* API Keys Section */}
        {/* <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <LockIcon />
            <h2 className="text-xl font-semibold">API Keys</h2>
          </div>
          <div className="bg-zinc-800 rounded-lg p-6">
            <p className="text-zinc-400 mb-4">Manage API keys for your integrations</p>
            <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition">
              Generate New Key
            </button>
          </div>
        </div> */}
      </div>
    </div>
  );
}