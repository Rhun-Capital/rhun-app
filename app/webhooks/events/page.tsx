'use client';

import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import Image from 'next/image';
import { Copy, Check, User, ChevronDown, ArrowUpRight } from 'lucide-react';

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

  const usdValue = isWhaleBuy ? event.toToken.usd_value : event.fromToken.usd_value;
  if (!usdValue) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 rounded-full">
        <ArrowUpRight className="w-4 h-4 text-green-400" />
        <span className="text-green-400 font-medium">
          {isWhaleBuy ? 'Big Buy' : 'Big Sell'}
        </span>
      </div>
      <span className="text-gray-400">
        {formatAmount(usdValue, 0, true)}
        {isTrackedHolder && trackedTokenName && trackedTokenName !== trackedToken && (
          <span className="ml-1">({trackedTokenName})</span>
        )}
      </span>
    </div>
  );
}

// Add HolographicCard component
const HolographicCard = ({ children, className = '', style }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePosition({ x, y });
  };

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 ${className}`}
      onMouseMove={handleMouseMove}
      style={style}
    >
      {/* Holographic effect */}
      <div 
        className="absolute inset-0 opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, 
            rgba(59, 130, 246, 0.2) 0%, 
            rgba(99, 102, 241, 0.1) 20%, 
            rgba(168, 85, 247, 0.05) 40%, 
            transparent 60%)`,
        }}
      />
      
      {children}
    </div>
  );
};

// Add global fade-in animation CSS
// Place this at the top of the file
<style jsx global>{`
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes fadeInNewEvent {
  0% { 
    opacity: 0;
    transform: translateY(-20px);
  }
  100% { 
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes slideIn {
  from { 
    opacity: 0;
    transform: translateX(-20px);
  }
  to { 
    opacity: 1;
    transform: translateX(0);
  }
}
@keyframes initialGlow {
  0% {
    box-shadow: 0 0 0 rgba(99, 102, 241, 0);
    border-color: rgba(99, 102, 241, 0);
  }
  50% {
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.5);
    border-color: rgba(99, 102, 241, 0.5);
  }
  100% {
    box-shadow: 0 0 0 rgba(99, 102, 241, 0);
    border-color: rgba(99, 102, 241, 0);
  }
}
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
@keyframes liveFeed {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
.new-event-fade-in {
  animation: fadeInNewEvent 1.5s cubic-bezier(0.4,0,0.2,1);
}
.event-card {
  animation: slideIn 0.5s cubic-bezier(0.4,0,0.2,1) forwards;
  opacity: 0;
}
.event-card > div {
  animation: initialGlow 1s ease-out 0.5s;
}
.live-feed {
  background: linear-gradient(90deg, 
    rgba(99, 102, 241, 0.1) 0%,
    rgba(99, 102, 241, 0.2) 50%,
    rgba(99, 102, 241, 0.1) 100%
  );
  background-size: 200% 100%;
  animation: liveFeed 2s ease-in-out infinite;
}
`}</style>

// Add token list interface and data
interface TokenOption {
  symbol: string;
  name: string;
  address: string;
  logoURI?: string;
}

const CURATED_TOKENS: TokenOption[] = [
  {
    symbol: 'BONK',
    name: 'Bonk',
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    logoURI: 'https://arweave.net/hQB3lpVr3wpxHkJW9iPz1wACwUAw4JfS9tT_1HpCbqU'
  },
  {
    symbol: 'WIF',
    name: 'dogwifhat',
    address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8MRB9Pk1K3qYb6R4b',
    logoURI: 'https://arweave.net/3yUyW1xg6AEw0Jc3FL3wH8PFJBvO0tRbjQdU0dE0p2A'
  },
  {
    symbol: 'MYRO',
    name: 'Myro',
    address: 'HyWfHfFkgQqVcDZJkFc15uYXqLS9UJx9V3zJ4KXqJ1t',
    logoURI: 'https://arweave.net/8PhnCqzqk3U5J3J3J3J3J3J3J3J3J3J3J3J3J3J3J3'
  },
  {
    symbol: 'POPCAT',
    name: 'Popcat',
    address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    logoURI: 'https://arweave.net/8PhnCqzqk3U5J3J3J3J3J3J3J3J3J3J3J3J3J3J3J3'
  },
  {
    symbol: 'BOME',
    name: 'Book of Meme',
    address: 'BomeD9Gp6Yj6X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X',
    logoURI: 'https://arweave.net/8PhnCqzqk3U5J3J3J3J3J3J3J3J3J3J3J3J3J3J3J3'
  },
  // Add more tokens as needed
];

export default function WebhookEventsPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackedTokens, setTrackedTokens] = useState<Record<string, any>>({});
  const [newEventSigs, setNewEventSigs] = useState<Set<string>>(new Set());
  const prevEventSigs = useRef<Set<string>>(new Set());
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
        
        // Convert current events to Set for comparison
        const currentSigs = new Set<string>((data.events || []).map((e: WebhookEvent) => e.signature));
        
        // Find new events by comparing with previous set
        const newSigs = new Set<string>();
        currentSigs.forEach(sig => {
          if (!prevEventSigs.current.has(sig)) {
            newSigs.add(sig);
          }
        });

        // Update new events state
        if (newSigs.size > 0) {
          setNewEventSigs(newSigs);
          // Clear new events after animation
          setTimeout(() => {
            setNewEventSigs(prev => {
              const updated = new Set(prev);
              newSigs.forEach(sig => updated.delete(sig));
              return updated;
            });
          }, 1500);
        }

        // Update previous events reference
        prevEventSigs.current = currentSigs;

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
    const interval = setInterval(fetchEvents, 30000);
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

  // Add token selection handler
  const toggleToken = (tokenAddress: string) => {
    setSelectedTokens(prev => 
      prev.includes(tokenAddress)
        ? prev.filter(addr => addr !== tokenAddress)
        : [...prev, tokenAddress]
    );
  };

  // Add filtered events
  const filteredEvents = events.filter(event => {
    if (selectedTokens.length === 0) return true;
    return selectedTokens.includes(event.tracked_token?.address || '');
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 h-screen flex flex-col">
      {/* Fixed Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Swap Events</h1>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 rounded-full">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-sm text-indigo-400 font-medium">Live Feed</span>
          </div>
        </div>
        
        {/* Token Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg border border-zinc-700 transition-colors"
          >
            <span className="text-sm text-gray-300">
              {selectedTokens.length === 0 
                ? 'All Tokens' 
                : `${selectedTokens.length} Selected`}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-zinc-800 rounded-lg border border-zinc-700 shadow-lg z-50">
              <div className="p-2">
                <div className="text-xs text-gray-400 px-2 py-1">Select tokens to monitor</div>
                <div className="max-h-60 overflow-y-auto">
                  {CURATED_TOKENS.map((token) => (
                    <label
                      key={token.address}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-700/50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTokens.includes(token.address)}
                        onChange={() => toggleToken(token.address)}
                        className="rounded border-zinc-600 text-indigo-500 focus:ring-indigo-500"
                      />
                      <div className="flex items-center gap-2">
                        {token.logoURI && (
                          <div className="relative w-5 h-5">
                            <Image
                              src={token.logoURI}
                              alt={token.symbol}
                              fill
                              className="rounded-full"
                            />
                          </div>
                        )}
                        <div>
                          <div className="text-sm text-gray-200">{token.symbol}</div>
                          <div className="text-xs text-gray-400">{token.name}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Feed Container */}
      <div className="flex-1 overflow-y-auto pr-2 -mr-2">
        {events.length === 0 ? (
          <div className="text-center text-gray-500">
            No swap events received yet
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event, index) => (
              <HolographicCard 
                key={event.signature} 
                className={`group hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all duration-300 ${
                  newEventSigs.has(event.signature) ? 'new-event-fade-in' : 'event-card'
                }`}
                style={{
                  animationDelay: newEventSigs.has(event.signature) ? '0s' : `${index * 0.1}s`
                }}
              >
                <div className="relative overflow-hidden rounded-lg transition-all duration-300 border border-transparent group-hover:border-indigo-400 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                  {/* Gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black opacity-95" />
                  
                  {/* Content */}
                  <div className="relative p-4">
                    {event.holder_mapping && (
                      <div className="mb-2 flex items-center text-yellow-400">
                        <TokenIcon 
                          symbol={event.holder_mapping.token_symbol} 
                          logoURI={event.tracked_token?.logoURI} 
                        />
                        <span className="ml-2 font-bold">
                          {event.holder_mapping.token_symbol} Whale
                        </span>
                        <span className="ml-2 text-gray-300">
                          just bought {formatAmount(event.toToken.amount)} {event.toToken.symbol}
                          {event.toToken.usd_value && (
                            <> ({formatAmount(event.toToken.usd_value, 0, true)})</>
                          )}
                        </span>
                      </div>
                    )}
                    
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
                      <div className="mt-2 p-2 bg-zinc-800/50 rounded-lg">
                        <div className="text-sm font-medium text-gray-300">
                          Swap Value: {formatAmount(event.swap_value_usd, 0, true)}
                        </div>
                      </div>
                    )}

                    <div className="mt-2 text-sm text-gray-400 flex items-center justify-between">
                      <WhaleMovementNotification event={event} />
                      <div className="flex items-center gap-4">
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
                  </div>
                </div>
              </HolographicCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 