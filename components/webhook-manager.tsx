'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { usePrivy } from '@privy-io/react-auth';

interface Webhook {
  webhookID: string;
  webhookURL: string;
  transactionTypes: string[];
  accountAddresses: string[];
  webhookType: string;
}

export function WebhookManager() {
  const { getAccessToken } = usePrivy();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [tokenAddress, setTokenAddress] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [isLoadingHolders, setIsLoadingHolders] = useState(false);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [newWebhook, setNewWebhook] = useState<{
    webhookURL: string;
    transactionTypes: string[];
    accountAddresses: string[];
    tokenAddress?: string;
    tokenSymbol?: string;
    tokenName?: string;
  }>({
    webhookURL: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/solana/webhook`,
    transactionTypes: ['SWAP'],
    accountAddresses: []
  });

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchTopHolders = async () => {
    if (!tokenAddress) {
      toast.error('Please enter a token address');
      return;
    }

    setIsLoadingHolders(true);
    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`/api/solana/token/${tokenAddress}/holders`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch holders');
      }

      const data = await response.json();
      const topHolders = data.slice(0, 10).map((holder: any) => holder.address);
      
      // Make sure we have token metadata - fetch if missing
      if (!tokenSymbol || !tokenName) {
        await fetchTokenMetadata(tokenAddress);
      }
      
      // Use the current state values which may have been updated by fetchTokenMetadata
      setNewWebhook(prev => ({
        ...prev,
        accountAddresses: topHolders,
        tokenAddress: tokenAddress,
        tokenSymbol: tokenSymbol || 'Unknown',
        tokenName: tokenName || 'Unknown Token'
      }));
      
      toast.success(`Added ${topHolders.length} top holders to webhook`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoadingHolders(false);
    }
  };

  const fetchWebhooks = async () => {
    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/solana/webhooks', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch webhooks');
      const data = await response.json();
      setWebhooks(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterWebhook = async () => {
    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/solana/webhooks', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(newWebhook),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to register webhook');
      }
      
      await fetchWebhooks();
      setNewWebhook({
        webhookURL: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/solana/webhook`,
        transactionTypes: ['SWAP'],
        accountAddresses: [],
      });
      setTokenAddress('');
      setTokenSymbol('');
      setTokenName('');
      toast.success('Webhook registered successfully');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteWebhook = async (webhookID: string) => {
    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`/api/solana/webhooks/${webhookID}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete webhook');
      }
      
      await fetchWebhooks();
      toast.success('Webhook deleted successfully');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Handle token address change with metadata lookup
  const handleTokenAddressChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;
    setTokenAddress(address);
    
    // Clear existing token metadata
    if (!address) {
      setTokenSymbol('');
      setTokenName('');
      return;
    }
    
    // Only fetch metadata if it's a valid-looking address
    if (address.length === 44 && /^[1-9A-HJ-NP-Za-km-z]{44}$/.test(address)) {
      await fetchTokenMetadata(address);
    }
  };
  
  // Fetch token metadata
  const fetchTokenMetadata = async (address: string) => {
    try {
      setIsLoadingMetadata(true);
      const accessToken = await getAccessToken();
      
      const metadataResponse = await fetch(`/api/solana/token/${address}/metadata`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (metadataResponse.ok) {
        const metadata = await metadataResponse.json();
        
        // Update state and webhook data in one go
        if (metadata.symbol) {
          setTokenSymbol(metadata.symbol);
        }
        if (metadata.name) {
          setTokenName(metadata.name);
        }
        
        // Also update the newWebhook object with this metadata
        setNewWebhook(prev => {
          const updated = {
            ...prev,
            tokenAddress: address,
            tokenSymbol: metadata.symbol || 'Unknown',
            tokenName: metadata.name || 'Unknown Token'
          };
          return updated;
        });
        
        toast.success('Token metadata loaded');
      } else {
        // Handle API error
        const errorData = await metadataResponse.json().catch(() => ({ error: 'Unknown error' }));
        toast.error(`Failed to load token metadata: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error('Failed to load token metadata');
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  // Handle token symbol change
  const handleTokenSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const symbol = e.target.value;
    setTokenSymbol(symbol);
    
    // Also update the webhook data
    setNewWebhook(prev => ({
      ...prev,
      tokenSymbol: symbol || 'Unknown'
    }));
  };
  
  // Handle token name change
  const handleTokenNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setTokenName(name);
    
    // Also update the webhook data
    setNewWebhook(prev => ({
      ...prev,
      tokenName: name || 'Unknown Token'
    }));
  };

  if (loading) {
    return <div>Loading webhooks...</div>;
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Warning about webhook URL */}
      <div className="bg-amber-900/30 border border-amber-700 text-amber-200 p-4 rounded-lg mb-4">
        <h3 className="text-lg font-semibold mb-1">Important: Webhook URL Requirements</h3>
        <p>Your webhook URL must be:</p>
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li>Publicly accessible (no localhost or private IPs)</li>
          <li>HTTPS with valid SSL certificate</li>
          <li>Always available to receive webhook events</li>
          <li><strong>Note:</strong> Temporary ngrok URLs might not work reliably with Helius</li>
        </ul>
        <p className="mt-2">Set <code>NEXT_PUBLIC_URL</code> in your environment to your public-facing URL.</p>
        <p className="mt-1">Current URL: <code>{process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}</code></p>
      </div>
      
      {/* Webhook Registration Form */}
      <div className="bg-gray-900 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Register New Webhook</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Webhook URL</label>
            <input
              type="text"
              value={newWebhook.webhookURL}
              onChange={(e) => setNewWebhook({ ...newWebhook, webhookURL: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="https://your-domain.com/api/solana/webhook"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Transaction Types</label>
            <div className="space-y-2">
              {['SWAP', 'NFT_SALE', 'NFT_LISTING', 'NFT_CANCEL_LISTING', 'NFT_MINT'].map((type) => (
                <label key={type} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newWebhook.transactionTypes.includes(type)}
                    onChange={(e) => {
                      const types = e.target.checked
                        ? [...newWebhook.transactionTypes, type]
                        : newWebhook.transactionTypes.filter(t => t !== type);
                      setNewWebhook({ ...newWebhook, transactionTypes: types });
                    }}
                    className="rounded border-gray-700 text-blue-500 focus:ring-blue-500"
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Token Address (for holders)</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={tokenAddress}
                onChange={handleTokenAddressChange}
                className="flex-1 px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter token address to fetch top holders"
              />
              <button
                onClick={fetchTopHolders}
                disabled={isLoadingHolders || !tokenAddress}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingHolders ? 'Loading...' : 'Fetch Holders'}
              </button>
            </div>
            {tokenAddress && (
              <div className="flex space-x-4 mt-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Token Symbol {isLoadingMetadata && <span className="text-amber-400">(loading...)</span>}
                  </label>
                  <input
                    type="text"
                    value={tokenSymbol}
                    onChange={handleTokenSymbolChange}
                    className="w-full px-3 py-1 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                    placeholder="Token Symbol"
                    disabled={isLoadingMetadata}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Token Name {isLoadingMetadata && <span className="text-amber-400">(loading...)</span>}
                  </label>
                  <input
                    type="text"
                    value={tokenName}
                    onChange={handleTokenNameChange}
                    className="w-full px-3 py-1 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                    placeholder="Token Name"
                    disabled={isLoadingMetadata}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Account Addresses</label>
            <textarea
              value={newWebhook.accountAddresses.join('\n')}
              onChange={(e) => setNewWebhook({ ...newWebhook, accountAddresses: e.target.value.split('\n').filter(addr => addr.trim()) })}
              className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-32"
              placeholder="Enter account addresses (one per line)"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={handleRegisterWebhook}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registering...' : 'Register Webhook'}
            </button>
          </div>
          
          {/* Debug information */}
          <div className="mt-4 p-3 bg-gray-900 border border-gray-700 rounded text-xs">
            <div className="font-semibold text-gray-300 mb-1">Webhook data preview:</div>
            <div className="font-mono overflow-x-auto">
              <pre className="text-gray-400">
                {JSON.stringify(
                  {
                    ...newWebhook,
                    accountAddresses: newWebhook.accountAddresses.length 
                      ? `[${newWebhook.accountAddresses.length} addresses]` 
                      : []
                  }, 
                  null, 2
                )}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Webhooks List */}
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Registered Webhooks</h2>
          <button
            onClick={fetchWebhooks}
            disabled={loading}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        
        <div className="space-y-4">
          {webhooks.length === 0 ? (
            <p className="text-gray-400">No webhooks registered</p>
          ) : (
            webhooks.map((webhook) => (
              <div key={webhook.webhookID} className="bg-gray-800 rounded p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-400">Webhook ID: {webhook.webhookID}</p>
                    <p className="text-sm text-gray-400">URL: {webhook.webhookURL}</p>
                    <p className="text-sm text-gray-400">
                      Transaction Types: {webhook.transactionTypes.join(', ')}
                    </p>
                    <p className="text-sm text-gray-400">
                      Account Addresses: {webhook.accountAddresses.length}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDeleteWebhook(webhook.webhookID)}
                      disabled={loading}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 