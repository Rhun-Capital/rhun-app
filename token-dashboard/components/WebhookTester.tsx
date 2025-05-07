'use client';

import { useState, useEffect, useRef } from 'react';

interface WebhookEvent {
  signature: string;
  timestamp: number;
  description: string;
  type: string;
  accounts: string[];
  receivedAt?: string;
  holder_address?: string;
  tokenInfo?: {
    action: string;
    fromToken?: { amount?: number; symbol?: string };
    toToken?: { amount?: number; symbol?: string };
  };
  fromTokenMetadata?: {
    image: string;
    symbol?: string;
    name?: string;
  };
  toTokenMetadata?: {
    image: string;
    symbol?: string;
    name?: string;
  };
  holder_mapping?: {
    token_address: string;
    token_symbol: string;
    token_name: string;
    webhook_id: string;
  } | null;
}

export default function WebhookTester() {
  const [webhookId, setWebhookId] = useState<string>('');
  const [tokenMint, setTokenMint] = useState<string>('');
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [liveEvents, setLiveEvents] = useState<WebhookEvent[]>([]);
  const [testPayload, setTestPayload] = useState<string>('{\n  "signature": "test_signature",\n  "timestamp": ' + Date.now() + ',\n  "type": "TEST_EVENT",\n  "description": "Test webhook event",\n  "accountData": [\n    {\n      "account": "' + tokenMint + '",\n      "nativeBalanceChange": 1000000000,\n      "tokenBalanceChanges": []\n    }\n  ]\n}');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('register');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLivePolling, setIsLivePolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastEventCountRef = useRef<number>(0);

  // Helper function to format address for display
  const formatAddress = (address: string): string => {
    if (!address) return '';
    if (address === 'So11111111111111111111111111111111111111112') return 'Native SOL';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Token icon component
  const TokenIcon = ({ symbol, imageUrl }: { symbol: string; imageUrl?: string }) => {
    const [imageError, setImageError] = useState(false);
    
    // If image fails to load or there's no image URL, show a fallback
    if (imageError || !imageUrl) {
      // Generate a color based on the symbol
      const colors = [
        'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
        'bg-pink-500', 'bg-yellow-500', 'bg-red-500'
      ];
      const colorIndex = symbol.charCodeAt(0) % colors.length;
      const firstLetter = symbol.charAt(0).toUpperCase();
      
      return (
        <div className={`w-6 h-6 rounded-full ${colors[colorIndex]} flex items-center justify-center text-white text-xs font-medium`}>
          {firstLetter}
        </div>
      );
    }
    
    return (
      <div className="relative w-6 h-6">
        <img
          src={imageUrl}
          alt={symbol}
          className="w-6 h-6 rounded-full"
          onError={() => setImageError(true)}
        />
      </div>
    );
  };

  // Load webhook information when the component mounts
  useEffect(() => {
    const getStoredInfo = async () => {
      try {
        // Set webhook URL from environment or window location
        const baseUrl = typeof window !== 'undefined' 
          ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin)
          : process.env.NEXT_PUBLIC_APP_URL || '';
        
        if (baseUrl) {
          setWebhookUrl(`${baseUrl}/api/solana/webhook`);
        }
        
        // Get recent webhook events
        await fetchWebhookEvents();
        
        // Start with a single fetch of live events
        await fetchLiveEvents();
      } catch (error) {
        console.error('Error loading webhook info:', error);
      }
    };
    
    getStoredInfo();
    
    // Cleanup polling interval on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);
  
  // Effect to handle live polling
  useEffect(() => {
    if (isLivePolling) {
      // Start polling
      pollingIntervalRef.current = setInterval(fetchLiveEvents, 2000);
    } else {
      // Stop polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
    
    // Cleanup on unmount or when isLivePolling changes
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isLivePolling]);

  // Helper functions for messages
  const showError = (message: string) => {
    setErrorMessage(message);
    setSuccessMessage('');
    setTimeout(() => setErrorMessage(''), 5000);
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setErrorMessage('');
    setTimeout(() => setSuccessMessage(''), 5000);
  };
  
  // Register a new webhook
  const registerWebhook = async () => {
    if (!tokenMint) {
      showError("Please enter a token mint address");
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/solana/webhook/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokenMint }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to register webhook');
      }
      
      // Update state with the new webhook information
      setWebhookId(data.webhookId);
      setWebhookUrl(data.webhookUrl);
      
      showSuccess("Webhook registered successfully!");
    } catch (error: any) {
      console.error('Error registering webhook:', error);
      showError(error.message || "Failed to register webhook");
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch recent webhook events from DynamoDB
  const fetchWebhookEvents = async () => {
    try {
      const response = await fetch('/api/solana/webhook/events');
      
      if (!response.ok) {
        // Handle 404 or other errors gracefully
        if (response.status === 404) {
          console.warn('Webhook events endpoint not implemented yet');
          return;
        }
        throw new Error('Failed to fetch webhook events');
      }
      
      const data = await response.json();
      setWebhookEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching webhook events:', error);
    }
  };
  
  // Fetch live events from in-memory store
  const fetchLiveEvents = async () => {
    try {
      const response = await fetch('/api/solana/webhook');
      
      if (!response.ok) {
        // Just log error but don't show to user for polling
        console.error('Error fetching live events:', response.statusText);
        return;
      }
      
      const data = await response.json();
      setLiveEvents(data.events || []);
      
      // Check if new events arrived
      if (data.count > lastEventCountRef.current) {
        const newEventsCount = data.count - lastEventCountRef.current;
        if (lastEventCountRef.current > 0) { // Don't show on first load
          showSuccess(`${newEventsCount} new webhook event${newEventsCount > 1 ? 's' : ''} received!`);
        }
        lastEventCountRef.current = data.count;
      }
    } catch (error) {
      console.error('Error fetching live events:', error);
    }
  };
  
  // Toggle live polling
  const toggleLivePolling = () => {
    setIsLivePolling(!isLivePolling);
  };
  
  // Send a test event to the webhook
  const sendTestEvent = async () => {
    setLoading(true);
    
    try {
      // Parse the JSON to validate it
      const payload = JSON.parse(testPayload);
      
      // Send directly to our webhook endpoint
      const response = await fetch('/api/solana/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: testPayload,
      });
      
      if (!response.ok) {
        throw new Error('Failed to send test event');
      }
      
      const data = await response.json();
      
      showSuccess(`Test event sent successfully! Processed ${data.processed || 0} events.`);
      
      // Start live polling if not already
      if (!isLivePolling) {
        setIsLivePolling(true);
      }
      
      // Refresh the events lists
      await fetchWebhookEvents();
      await fetchLiveEvents();
    } catch (error: any) {
      console.error('Error sending test event:', error);
      showError(error.message || "Failed to send test event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Message displays */}
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <span className="block sm:inline">{errorMessage}</span>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <span className="block sm:inline">{successMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('register')}
            className={`mr-1 py-2 px-4 font-medium text-sm ${
              activeTab === 'register'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Register Webhook
          </button>
          <button
            onClick={() => setActiveTab('monitor')}
            className={`mr-1 py-2 px-4 font-medium text-sm ${
              activeTab === 'monitor'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Monitor Events
          </button>
          <button
            onClick={() => setActiveTab('stream')}
            className={`mr-1 py-2 px-4 font-medium text-sm ${
              activeTab === 'stream'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Live Stream
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`mr-1 py-2 px-4 font-medium text-sm ${
              activeTab === 'test'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Test Webhook
          </button>
        </nav>
      </div>

      {/* Register Tab */}
      {activeTab === 'register' && (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Register a Webhook</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Create a webhook to track activities for a Solana token
            </p>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="mb-4">
              <label htmlFor="tokenMint" className="block text-sm font-medium text-gray-700">Token Mint Address</label>
              <input
                type="text"
                id="tokenMint"
                className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                placeholder="Enter Solana token mint address"
                value={tokenMint}
                onChange={(e) => setTokenMint(e.target.value)}
              />
            </div>
            
            <div className="rounded-md bg-blue-50 p-4 mt-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Webhook Endpoint Information</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Webhook URL: {webhookUrl}</p>
                    {webhookId && (
                      <>
                        <p>Webhook ID: {webhookId}</p>
                        <p>Registered Token: {tokenMint}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <button
              type="button"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={registerWebhook}
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register Webhook'}
            </button>
          </div>
        </div>
      )}
      
      {/* Monitor Tab */}
      {activeTab === 'monitor' && (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Webhook Events</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              View events stored in the database
            </p>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            {webhookEvents.length > 0 ? (
              <div className="space-y-4">
                {webhookEvents.map((event, index) => (
                  <div key={index} className="border rounded-md p-4">
                    {/* Token holder label */}
                    {event.holder_mapping && (
                      <div className="mb-3">
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 text-blue-700">
                          <TokenIcon 
                            symbol={event.holder_mapping.token_symbol} 
                            imageUrl={`/api/solana/token/${event.holder_mapping.token_address}/metadata`}
                          />
                          <span className="ml-1.5">
                            {event.holder_mapping.token_symbol} Holder
                            {event.holder_mapping.token_name && 
                            event.holder_mapping.token_name !== event.holder_mapping.token_symbol && (
                              <span className="text-gray-500 ml-1">
                                ({event.holder_mapping.token_name})
                              </span>
                            )}
                            <span className="ml-1.5 text-gray-500">
                              {formatAddress(event.holder_mapping.token_address)}
                            </span>
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <p className="font-semibold">{event.type} - {new Date(event.timestamp).toLocaleString()}</p>
                    <p className="text-sm text-gray-600">{event.description}</p>
                    <p className="text-xs text-gray-500">Signature: {event.signature}</p>
                    <div className="mt-2">
                      <p className="text-xs font-semibold">Accounts:</p>
                      <ul className="text-xs list-disc pl-4">
                        {event.accounts.map((account, i) => (
                          <li key={i}>{account}</li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* Show holder address if available */}
                    {event.holder_address && (
                      <div className="mt-2 text-xs">
                        <span className="font-semibold">Holder Address:</span> {event.holder_address}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No webhook events found in database.</p>
                <p className="text-sm mt-2">Try sending a test event or wait for activity on the token.</p>
              </div>
            )}
          </div>
          
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <button
              type="button"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={fetchWebhookEvents}
            >
              Refresh Events
            </button>
          </div>
        </div>
      )}
      
      {/* Live Stream Tab */}
      {activeTab === 'stream' && (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Live Webhook Stream</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                View webhook events as they arrive in real-time
              </p>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${isLivePolling ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <button
                type="button"
                className={`px-3 py-1 text-sm font-medium rounded-md ${
                  isLivePolling 
                    ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                }`}
                onClick={toggleLivePolling}
              >
                {isLivePolling ? 'Stop' : 'Start'} Stream
              </button>
            </div>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6 max-h-96 overflow-y-auto">
            {liveEvents.length > 0 ? (
              <div className="space-y-4">
                {liveEvents.map((event, index) => (
                  <div key={index} className="border rounded-md p-4">
                    {/* Token holder label */}
                    {event.holder_mapping && (
                      <div className="mb-3">
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 text-blue-700">
                          <TokenIcon 
                            symbol={event.holder_mapping.token_symbol} 
                            imageUrl={`/api/solana/token/${event.holder_mapping.token_address}/metadata`}
                          />
                          <span className="ml-1.5">
                            {event.holder_mapping.token_symbol} Holder
                            {event.holder_mapping.token_name && 
                            event.holder_mapping.token_name !== event.holder_mapping.token_symbol && (
                              <span className="text-gray-500 ml-1">
                                ({event.holder_mapping.token_name})
                              </span>
                            )}
                            <span className="ml-1.5 text-gray-500">
                              {formatAddress(event.holder_mapping.token_address)}
                            </span>
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <p className="font-semibold">{event.type}</p>
                      <p className="text-xs text-gray-500">
                        {event.receivedAt ? `Received: ${new Date(event.receivedAt).toLocaleString()}` : ''}
                      </p>
                    </div>
                    <p className="text-sm">Time: {new Date(event.timestamp).toLocaleString()}</p>
                    <p className="text-sm text-gray-600">{event.description}</p>
                    
                    {/* Rich Token Display */}
                    {event.tokenInfo && (
                      <div className="mt-3 border-t border-gray-100 pt-3">
                        {event.tokenInfo.action === 'swap' && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-50 rounded p-2">
                              <div className="flex items-center gap-2">
                                {event.fromTokenMetadata?.image && (
                                  <img 
                                    src={event.fromTokenMetadata.image} 
                                    alt={event.tokenInfo.fromToken?.symbol}
                                    className="w-6 h-6 rounded-full"
                                  />
                                )}
                                <div>
                                  <p className="font-medium">
                                    {event.tokenInfo.fromToken?.amount?.toLocaleString(undefined, {maximumFractionDigits: 6})} {' '}
                                    {event.fromTokenMetadata?.symbol || event.tokenInfo.fromToken?.symbol}
                                  </p>
                                  {event.fromTokenMetadata?.name && (
                                    <p className="text-xs text-gray-500">{event.fromTokenMetadata.name}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            
                            <div className="flex-1 bg-gray-50 rounded p-2">
                              <div className="flex items-center gap-2">
                                {event.toTokenMetadata?.image && (
                                  <img 
                                    src={event.toTokenMetadata.image} 
                                    alt={event.tokenInfo.toToken?.symbol}
                                    className="w-6 h-6 rounded-full"
                                  />
                                )}
                                <div>
                                  <p className="font-medium">
                                    {event.tokenInfo.toToken?.amount?.toLocaleString(undefined, {maximumFractionDigits: 6})} {' '}
                                    {event.toTokenMetadata?.symbol || event.tokenInfo.toToken?.symbol}
                                  </p>
                                  {event.toTokenMetadata?.name && (
                                    <p className="text-xs text-gray-500">{event.toTokenMetadata.name}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Show holder address if available */}
                    {event.holder_address && (
                      <div className="mt-2 text-xs">
                        <span className="font-semibold">Holder Address:</span> {event.holder_address}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No webhook events received yet.</p>
                <p className="text-sm mt-2">Start the stream and wait for events or send a test event.</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Test Tab */}
      {activeTab === 'test' && (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Test Webhook</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Send a test event to your webhook endpoint
            </p>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="mb-4">
              <label htmlFor="testPayload" className="block text-sm font-medium text-gray-700">Test Payload</label>
              <textarea
                id="testPayload"
                rows={10}
                className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
              />
              <p className="mt-2 text-sm text-gray-500">
                This JSON payload will be sent to your webhook endpoint
              </p>
            </div>
          </div>
          
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <button
              type="button"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={sendTestEvent}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Test Event'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 