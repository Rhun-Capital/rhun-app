'use client';

import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import Image from 'next/image';
import { Copy, Check, User } from 'lucide-react';

interface TokenMetadata {
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  address?: string;
}

interface Token {
  symbol: string;
  amount: number;
  metadata?: TokenMetadata;
  usd_value?: number;
}

interface WebhookEvent {
  signature: string;
  timestamp: number;
  type: string;
  description: string;
  holder_address: string;
  native_balance_change: number;
  token_transfers: any[];
  fromToken: Token;
  toToken: Token;
  tracked_token?: {
    symbol: string;
    address: string;
    name?: string;
    logoURI?: string;
  };
  holder_mapping?: {
    token_address: string;
    token_symbol: string;
    token_name: string;
    webhook_id: string;
  } | null;
  swap_value_usd?: number;
}

// Update the formatAmount function to default to decimals=0 for human-readable values
const formatAmount = (amount: number, decimals: number = 0, isUSD: boolean = false) => {
  if (isUSD) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }
  // No division by decimals, just format as a number
  if (amount < 0.0001 && amount > 0) {
    return amount.toFixed(8).replace(/\.?0+$/, '');
  }
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6
  });
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <button 
      onClick={handleCopy}
      className="ml-1 p-1 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors"
    >
      {copied ? (
        <Check className="h-3 w-3" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

function formatAddress(address?: string): string {
  if (!address) return '';
  if (address === 'So11111111111111111111111111111111111111112') return 'Native SOL';
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function TokenIcon({ symbol, logoURI }: { symbol: string; logoURI?: string }) {
  const [imageError, setImageError] = useState(false);
  const firstLetter = symbol.charAt(0).toUpperCase();
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-indigo-500',
  ];
  
  // Use the first letter's char code to pick a consistent color
  const colorIndex = firstLetter.charCodeAt(0) % colors.length;

  // Special case for SOL
  if (symbol === 'SOL') {
    return (
      <div className="relative w-8 h-8">
        <Image
          src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
          alt="SOL"
          fill
          className="rounded-full"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // If image failed to load or no logoURI, show the letter circle
  if (imageError || !logoURI) {
    return (
      <div className={`w-8 h-8 rounded-full ${colors[colorIndex]} flex items-center justify-center text-white font-medium`}>
        {firstLetter}
      </div>
    );
  }

  // Try to load the image
  return (
    <div className="relative w-8 h-8">
      <Image
        src={logoURI}
        alt={symbol}
        fill
        className="rounded-full"
        onError={() => setImageError(true)}
      />
    </div>
  );
}

function WhaleMovementNotification({ event }: { event: WebhookEvent }) {
  const isWhaleMovement = (amount: number, symbol: string) => {
    // Define whale thresholds for different tokens
    const thresholds: Record<string, number> = {
      'SOL': 1000, // 1000 SOL
      'BONK': 1000000000, // 1B BONK
      'JUP': 100000, // 100K JUP
      'PYTH': 10000, // 10K PYTH
      // Add more tokens and their thresholds as needed
    };

    const threshold = thresholds[symbol] || 100000; // Default threshold
    return amount >= threshold;
  };

  const isWhaleBuy = isWhaleMovement(event.toToken.amount, event.toToken.symbol);
  const isWhaleSell = isWhaleMovement(event.fromToken.amount, event.fromToken.symbol);

  if (!isWhaleBuy && !isWhaleSell) return null;

  // Get the token being tracked for this holder
  const trackedToken = event.holder_mapping?.token_symbol || event.tracked_token?.symbol;
  const trackedTokenName = event.holder_mapping?.token_name || event.tracked_token?.name;
  const isTrackedHolder = !!trackedToken;

  return (
    <div className="mb-2 p-2 bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg border border-purple-500/30">
      <div className="flex items-center text-yellow-400">
        <span className="text-sm font-medium">
          🐋 {isTrackedHolder ? `${trackedToken} Whale` : 'Whale'} {isWhaleBuy ? 'Bought' : 'Sold'} {isWhaleBuy ? event.toToken.symbol : event.fromToken.symbol}!
        </span>
      </div>
      <div className="text-xs text-gray-300 mt-1">
        Amount: {formatAmount(
          isWhaleBuy ? event.toToken.amount : event.fromToken.amount,
          isWhaleBuy ? event.toToken.metadata?.decimals : event.fromToken.metadata?.decimals
        )} {isWhaleBuy ? event.toToken.symbol : event.fromToken.symbol}
        {isTrackedHolder && trackedTokenName && trackedTokenName !== trackedToken && (
          <span className="ml-1 text-gray-400">({trackedTokenName})</span>
        )}
      </div>
    </div>
  );
}

// Add global fade-in animation CSS
// Place this at the top of the file
<style jsx global>{`
@keyframes fadeInNewEvent {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: none; }
}
.new-event-fade-in {
  animation: fadeInNewEvent 1.5s cubic-bezier(0.4,0,0.2,1);
}
`}</style>

export default function WebhookEventsPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackedTokens, setTrackedTokens] = useState<Record<string, any>>({});
  const [newEventSigs, setNewEventSigs] = useState<string[]>([]);
  const prevEventSigs = useRef<string[]>([]);

  useEffect(() => {
    // Fetch tracked tokens from webhooks endpoint
    const fetchTrackedTokens = async () => {
      try {
        // First try to get existing registered webhooks
        const response = await fetch('/api/solana/webhooks');
        if (!response.ok) {
          throw new Error('Failed to fetch webhooks');
        }
        const data = await response.json();
        
        // Collect all unique addresses from webhooks
        const allAddresses = new Set<string>();
        
        if (data.webhooks) {
          data.webhooks.forEach((webhook: any) => {
            if (webhook.accountAddresses && webhook.accountAddresses.length > 0) {
              webhook.accountAddresses.forEach((address: string) => {
                allAddresses.add(address);
              });
            }
          });
        }
        
        if (allAddresses.size === 0) {
          return;
        }
        
        // Fetch token info for all addresses in a batch
        try {
          const batchResponse = await fetch('/api/solana/webhook/events/batch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              addresses: Array.from(allAddresses)
            })
          });
          
          if (batchResponse.ok) {
            const batchData = await batchResponse.json();
            setTrackedTokens(batchData.tokens || {});
            return;
          }
        } catch (batchError) {
          // Fall back to traditional approach
        }
        
        // Create a mapping of account addresses to token info
        const tokenMap: Record<string, any> = {};
        
        // Process addresses from each webhook
        if (data.webhooks) {
          const processedAddresses = new Set<string>();
          
          for (const webhook of data.webhooks) {
            if (webhook.accountAddresses && webhook.accountAddresses.length > 0) {
              for (const address of webhook.accountAddresses) {
                // Skip if we've already processed this address
                if (processedAddresses.has(address)) continue;
                processedAddresses.add(address);
                
                // Fetch token info for this holder from our database
                try {
                  const holderResponse = await fetch(`/api/solana/holder/${address}/token`);
                  if (holderResponse.ok) {
                    const holderData = await holderResponse.json();
                    if (holderData.found) {
                      // Get token metadata including icon
                      let logoURI = null;
                      try {
                        const metadataResponse = await fetch(`/api/solana/token/${holderData.token_address}/metadata`);
                        if (metadataResponse.ok) {
                          const metadataData = await metadataResponse.json();
                          logoURI = metadataData.logoURI;
                        }
                      } catch (metadataError) {
                        // Silently handle error
                      }
                      
                      tokenMap[address] = {
                        address: holderData.token_address,
                        symbol: holderData.token_symbol,
                        name: holderData.token_name,
                        logoURI: logoURI
                      };
                      continue;
                    }
                  }
                } catch (holderError) {
                  // Silently handle error
                }
                
                // Fallback to metadata from webhook if database lookup failed
                let tokenInfo;
                if (webhook.metadata && (webhook.metadata.tokenAddress || webhook.metadata.tokenSymbol)) {
                  tokenInfo = {
                    address: webhook.metadata.tokenAddress || '',
                    symbol: webhook.metadata.tokenSymbol || 'Unknown',
                    name: webhook.metadata.tokenName || 'Unknown Token'
                  };
                } else {
                  // Fallback to direct properties (old format or custom properties)
                  tokenInfo = {
                    address: webhook.tokenAddress || '',
                    symbol: webhook.tokenSymbol || 'Unknown',
                    name: webhook.tokenName || 'Unknown Token'
                  };
                }
                
                if (tokenInfo.address || tokenInfo.symbol !== 'Unknown') {
                  tokenMap[address] = tokenInfo;
                }
              }
            }
          }
        }
        
        setTrackedTokens(tokenMap);
      } catch (error) {
        // Silently handle error
      }
    };

    fetchTrackedTokens();
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/solana/webhook/events');
        if (!response.ok) throw new Error('Failed to fetch events');
        const data = await response.json();
        const newSigs = (data.events || []).map((e: WebhookEvent) => e.signature);
        // Compare with previous
        if (prevEventSigs.current.length > 0) {
          const diff = newSigs.filter((sig: string) => !prevEventSigs.current.includes(sig));
          if (diff.length > 0) {
            setNewEventSigs(diff);
            setTimeout(() => setNewEventSigs([]), 1500);
          }
        }
        prevEventSigs.current = newSigs;
        // Enrich events with tracked token info
        const enrichedEvents = (data.events || []).map((event: WebhookEvent) => {
          if (trackedTokens[event.holder_address]) {
            return {
              ...event,
              tracked_token: trackedTokens[event.holder_address]
            };
          }
          return event;
        });
        setEvents(enrichedEvents);
      } catch (error) {
        toast.error('Failed to fetch events');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
    const interval = setInterval(fetchEvents, 5000);
    return () => clearInterval(interval);
  }, [trackedTokens]);

  const formatTime = (timestamp: number) => {
    // Convert Unix timestamp from seconds to milliseconds
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const getTokenName = (token: Token) => {
    if (token.symbol === 'SOL') return 'Solana';
    return token.metadata?.name || token.symbol;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Swap Events</h1>
      
      {events.length === 0 ? (
        <div className="text-center text-gray-500">
          No swap events received yet
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.signature}
              className={`bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors ${
                newEventSigs.includes(event.signature) ? 'new-event-fade-in' : ''
              }`}
            >
              <WhaleMovementNotification event={event} />
              {/* Show tracked token info for all events */}
              {(event.holder_mapping || event.tracked_token) && (
                <div className="mb-2 text-xs text-yellow-400 flex items-center">
                  <div className="flex items-center">
                    <TokenIcon 
                      symbol={event.holder_mapping?.token_symbol || event.tracked_token?.symbol || ''} 
                      logoURI={event.tracked_token?.logoURI} 
                    />
                    <span className="ml-2">
                      {event.holder_mapping?.token_symbol || event.tracked_token?.symbol} Holder
                      {(event.holder_mapping?.token_name || event.tracked_token?.name) && 
                        (event.holder_mapping?.token_name !== event.holder_mapping?.token_symbol || 
                         event.tracked_token?.name !== event.tracked_token?.symbol) && (
                        <span className="text-gray-400 ml-1">
                          ({event.holder_mapping?.token_name || event.tracked_token?.name})
                        </span>
                      )}
                      {(event.holder_mapping?.token_address || event.tracked_token?.address) && (
                        <span className="ml-1 text-gray-400">
                          {formatAddress(event.holder_mapping?.token_address || event.tracked_token?.address)}
                          <CopyButton text={event.holder_mapping?.token_address || event.tracked_token?.address || ''} />
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-4">
                  {/* From Token */}
                  <div className="flex items-center space-x-2">
                    <TokenIcon 
                      symbol={event.fromToken.symbol} 
                      logoURI={event.fromToken.metadata?.logoURI}
                    />
                    <div>
                      <div className="font-medium">
                        {formatAmount(event.fromToken.amount)}
                      </div>
                      <div className="text-sm text-gray-400">{getTokenName(event.fromToken)}</div>
                      {event.fromToken.usd_value && (
                        <div className="text-xs text-gray-500">
                          {formatAmount(event.fromToken.usd_value, 0, true)}
                        </div>
                      )}
                      {event.fromToken.metadata?.address && (
                        <div className="text-xs text-gray-500 flex items-center">
                          {formatAddress(event.fromToken.metadata.address)}
                          <CopyButton text={event.fromToken.metadata.address} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="text-gray-400">→</div>

                  {/* To Token */}
                  <div className="flex items-center space-x-2">
                    <TokenIcon 
                      symbol={event.toToken.symbol} 
                      logoURI={event.toToken.metadata?.logoURI}
                    />
                    <div>
                      <div className="font-medium">
                        {formatAmount(event.toToken.amount)}
                      </div>
                      <div className="text-sm text-gray-400">{getTokenName(event.toToken)}</div>
                      {event.toToken.usd_value && (
                        <div className="text-xs text-gray-500">
                          {formatAmount(event.toToken.usd_value, 0, true)}
                        </div>
                      )}
                      {event.toToken.metadata?.address && (
                        <div className="text-xs text-gray-500 flex items-center">
                          {formatAddress(event.toToken.metadata.address)}
                          <CopyButton text={event.toToken.metadata.address} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-400">
                  {formatTime(event.timestamp)}
                </div>
              </div>

              {/* Add Swap Summary */}
              {event.swap_value_usd && (
                <div className="mt-2 p-2 bg-gray-700/50 rounded-lg">
                  <div className="text-sm font-medium text-gray-300">
                    Swap Value: {formatAmount(event.swap_value_usd, 0, true)}
                  </div>
                </div>
              )}

              <div className="mt-2 text-sm text-gray-400 flex items-center justify-between">
                <a 
                  href={`https://solscan.io/tx/${event.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  View on Solscan
                </a>
                <div className="text-xs text-gray-500 flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  {formatAddress(event.holder_address)}
                  <CopyButton text={event.holder_address} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 