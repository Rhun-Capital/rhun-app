'use client';

import { useState, useEffect } from 'react';
import { MoonIcon, SunIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { DexScreenerToken } from '@/utils/dexscreener';

// Use dynamic imports - note that TypeScript might raise prop type errors for 
// components loaded with dynamic imports, but they will work correctly at runtime
// @ts-ignore - Next.js dynamic import
const TokenTable = dynamic(() => import('./components/TokenTable'), { ssr: false });
// @ts-ignore - Next.js dynamic import
const TokenDetailPanel = dynamic(() => import('./components/TokenDetailPanel'), { ssr: false });

export default function Dashboard() {
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [selectedTokenData, setSelectedTokenData] = useState<DexScreenerToken | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('trending');
  const [debug, setDebug] = useState<string>('Loading tokens...');
  
  // List of available tabs
  const listTabs = [
    { id: 'trending', label: 'Trending' },
    { id: 'newest', label: 'Newest' },
    { id: 'gainers', label: 'Gainers' },
    { id: 'volume', label: 'Volume' },
    { id: 'liquidity', label: 'Liquidity' }
  ];
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    // Update the document class to reflect the dark mode state
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };
  
  // Apply dark mode class on initial render
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);
  
  // Handle selecting a token
  const handleSelectToken = (tokenAddress: string, tokenData?: any) => {
    setSelectedToken(tokenAddress);
    if (tokenData) {
      setSelectedTokenData(tokenData);
      setDebug(`Selected token: ${tokenData.symbol || tokenAddress}`);
    }
  };

  // Clear selection when changing tabs
  useEffect(() => {
    setSelectedToken(null);
    setSelectedTokenData(null);
    setDebug(`Changed to ${activeTab} tab`);
  }, [activeTab]);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-zinc-100 text-zinc-900'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Token Explorer</h1>
          
          <div className="flex items-center space-x-4">
            {/* Dark mode toggle */}
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors"
            >
              {isDarkMode ? <SunIcon size={18} /> : <MoonIcon size={18} />}
            </button>
          </div>
        </div>
        
        {/* Tab navigation */}
        <div className="flex overflow-x-auto space-x-1 mb-6 pb-1">
          {listTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md font-medium whitespace-nowrap transition-colors
                ${activeTab === tab.id 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content - token table */}
          <div className="lg:col-span-2 bg-zinc-800 bg-opacity-60 backdrop-blur-sm rounded-lg p-4 overflow-hidden border border-zinc-700">
            {/* @ts-ignore - Component works correctly at runtime */}
            <TokenTable 
              chainId="solana" 
              listType={activeTab}
              onSelectToken={handleSelectToken} 
              selectedToken={selectedToken}
            />
          </div>
          
          {/* Side panel - token details */}
          <div className="bg-zinc-800 bg-opacity-60 backdrop-blur-sm rounded-lg p-4 overflow-hidden border border-zinc-700">
            {selectedToken && selectedTokenData ? (
              // @ts-ignore - Component works correctly at runtime
              <TokenDetailPanel 
                tokenAddress={selectedToken} 
                tokenData={selectedTokenData} 
              />
            ) : (
              <div className="h-full flex items-center justify-center text-center p-6">
                <div>
                  <h3 className="text-lg font-medium text-zinc-300 mb-2">No Token Selected</h3>
                  <p className="text-zinc-500 text-sm">
                    Select a token from the table to view detailed information and trading signals.
                  </p>
                  <p className="text-xs text-zinc-600 mt-4">{debug}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 