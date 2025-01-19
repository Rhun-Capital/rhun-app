'use client';
import React, { useState, useEffect } from 'react';
import { PlusIcon, CheckIcon } from '@/components/icons';
import { IconWrapper } from './app-icons';
import { usePrivy } from '@privy-io/react-auth';

interface App {
  id: string;
  name: string;
  description: string;
  category: 'Wallet' | 'Portfolio' | 'Analytics' | 'Search' | 'Market';
  isInstalled?: boolean;
}

interface AppMarketplaceTabProps {
  agentId: string;
}

export default function AppMarketplaceTab({ agentId }: AppMarketplaceTabProps) {
  const { getAccessToken } = usePrivy();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Updated apps data
  const sampleApps: App[] = [
    {
      id: 'user-solana-balance',
      name: 'User Solana Balance',
      description: 'View your connected wallet\'s Solana balance',
      category: 'Wallet'
    },
    {
      id: 'agent-solana-balance',
      name: 'Agent Solana Balance',
      description: 'View the agent\'s embedded wallet Solana balance',
      category: 'Wallet'
    },
    {
      id: 'user-portfolio-value',
      name: 'User Portfolio Value',
      description: 'Track your connected wallet\'s total portfolio value',
      category: 'Portfolio'
    },
    {
      id: 'agent-portfolio-value',
      name: 'Agent Portfolio Value',
      description: 'Monitor the agent\'s embedded wallet portfolio value',
      category: 'Portfolio'
    },
    {
      id: 'user-token-holdings',
      name: 'User Token Holdings',
      description: 'View all tokens held in your connected wallet',
      category: 'Portfolio'
    },
    {
      id: 'agent-token-holdings',
      name: 'Agent Token Holdings',
      description: 'View all tokens held in the agent\'s embedded wallet',
      category: 'Portfolio'
    },
    {
      id: 'fear-greed-index',
      name: 'Fear & Greed Index',
      description: 'Track market sentiment with the Fear & Greed Index',
      category: 'Analytics'
    },
    {
      id: 'solana-volume',
      name: 'Solana Transaction Volume',
      description: 'Monitor Solana network transaction volume metrics',
      category: 'Analytics'
    },
    {
      id: 'token-info',
      name: 'Token Information',
      description: 'Get detailed information about any Solana token',
      category: 'Search'
    },
    {
      id: 'market-movers',
      name: 'Market Movers',
      description: 'Track top gaining and losing cryptocurrencies',
      category: 'Market'
    },
    {
      id: 'token-search',
      name: 'Token Search',
      description: 'Search for cryptocurrencies by name or symbol',
      category: 'Search'
    },
    {
      id: 'onchain-token-info',
      name: 'Onchain Token Info',
      description: 'Get detailed onchain data for Solana tokens',
      category: 'Analytics'
    }
  ];

  // Fetch installed apps for the agent
  useEffect(() => {
    const fetchInstalledApps = async () => {
      try {
        // In production, this would be an API call
        // const response = await fetch(`/api/agents/${agentId}/apps`);
        // const installedApps = await response.json();
        
        // For now, simulate some apps being installed
        const installedAppIds = ['token-search', 'token-info'];
        
        // Mark apps as installed
        const appsWithInstallStatus = sampleApps.map(app => ({
          ...app,
          isInstalled: installedAppIds.includes(app.id)
        }));
        
        setApps(appsWithInstallStatus);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching installed apps:', error);
        setLoading(false);
      }
    };

    fetchInstalledApps();
  }, [agentId]);

  const categories = ['all', 'Wallet', 'Portfolio', 'Analytics', 'Search', 'Market'];

  const filteredApps = apps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleInstallApp = async (appId: string) => {
    try {
      // In production, this would be an API call
      // await fetch(`/api/agents/${agentId}/apps/${appId}`, {
      //   method: 'POST',
      // });

      // Update local state
      setApps(prevApps =>
        prevApps.map(app =>
          app.id === appId ? { ...app, isInstalled: true } : app
        )
      );
    } catch (error) {
      console.error('Error installing app:', error);
    }
  };

  const handleUninstallApp = async (appId: string) => {
    try {
      // In production, this would be an API call
      // await fetch(`/api/agents/${agentId}/apps/${appId}`, {
      //   method: 'DELETE',
      // });

      // Update local state
      setApps(prevApps =>
        prevApps.map(app =>
          app.id === appId ? { ...app, isInstalled: false } : app
        )
      );
    } catch (error) {
      console.error('Error uninstalling app:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Coming Soon Overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-zinc-900/50 z-10 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-3xl font-bold text-white mb-2">Coming Soon</h3>
          <p className="text-zinc-400">The App Marketplace is under development</p>
        </div>
      </div>
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search apps..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-grow px-4 py-2 rounded-lg bg-zinc-700 text-zinc-300 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedCategory === category
                  ? 'bg-indigo-500 text-white'
                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Apps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredApps.map((app) => (
          <div
            key={app.id}
            className="p-6 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-600 transition"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <IconWrapper category={app.category} />
                <div>
                  <h3 className="font-medium text-lg">{app.name}</h3>
                  <span className="text-sm text-zinc-400">{app.category}</span>
                </div>
              </div>
              <button
                onClick={() => app.isInstalled ? handleUninstallApp(app.id) : handleInstallApp(app.id)}
                className={`p-2 rounded-lg transition ${
                  app.isInstalled
                    ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                    : 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20'
                }`}
              >
                {app.isInstalled ? (
                  <CheckIcon/>
                ) : (
                  <PlusIcon/>
                )}
              </button>
            </div>
            <p className="text-zinc-400 text-sm">{app.description}</p>
          </div>
        ))}
      </div>

      {filteredApps.length === 0 && (
        <div className="text-center py-12 text-zinc-400">
          No apps found matching your search criteria
        </div>
      )}
    </div>
  );
}