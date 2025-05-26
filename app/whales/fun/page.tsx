'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { ChevronDown, ArrowUpRight, User, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import './styles.css';
import { formatAmount, formatAddress } from '@/utils/format';

// Holographic Card Component
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
      className={`relative overflow-hidden rounded-xl bg-sky-50/80 backdrop-blur-xl border border-sky-100/50 shadow-lg transition-all duration-300 ${className}`}
      onMouseMove={handleMouseMove}
      style={style}
    >
      {/* Smoked glass gradient overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-sky-50/50 via-sky-100/30 to-transparent opacity-50 transition-opacity duration-300 group-hover:opacity-70"
      />
      
      {/* Holographic effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, 
            rgba(186, 230, 253, 0.6) 0%, 
            rgba(186, 230, 253, 0.3) 20%, 
            rgba(186, 230, 253, 0.1) 40%, 
            transparent 60%)`,
        }}
      />
      
      {/* Inner shadow for depth */}
      <div className="absolute inset-0 shadow-inner rounded-xl pointer-events-none opacity-30 group-hover:opacity-50 transition-opacity duration-300" />
      
      {children}
    </div>
  );
};

interface Token {
  symbol: string;
  amount: number;
  metadata?: TokenMetadata;
  usd_value?: number;
}

interface TokenMetadata {
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  address?: string;
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
    token_logo_uri?: string;
    token_decimals?: number;
  } | null;
  swap_value_usd?: number;
  receivedAt: string;
  accounts: string[];
}

// Add TokenIcon component
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
  
  const colorIndex = firstLetter.charCodeAt(0) % colors.length;

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

  if (imageError || !logoURI) {
    return (
      <div className={`w-8 h-8 rounded-full ${colors[colorIndex]} flex items-center justify-center text-white font-medium`}>
        {firstLetter}
      </div>
    );
  }

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
    const thresholds: Record<string, number> = {
      'SOL': 1000,
      'BONK': 1000000000,
      'JUP': 100000,
      'PYTH': 10000,
    };

    const threshold = thresholds[symbol] || 100000;
    return amount >= threshold;
  };

  const isWhaleBuy = isWhaleMovement(event.toToken.amount, event.toToken.symbol);
  const isWhaleSell = isWhaleMovement(event.fromToken.amount, event.fromToken.symbol);

  if (!isWhaleBuy && !isWhaleSell) return null;

  const trackedToken = event.holder_mapping?.token_symbol || event.tracked_token?.symbol;
  const trackedTokenName = event.holder_mapping?.token_name || event.tracked_token?.name;
  const isTrackedHolder = !!trackedToken;

  const usdValue = isWhaleBuy ? event.toToken.usd_value : event.fromToken.usd_value;
  if (!usdValue) return null;

  return (
    <div className="flex items-center gap-2 text-sm mt-2">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-100/50 backdrop-blur-sm rounded-full border border-sky-200/50">
        <ArrowUpRight className="w-4 h-4 text-sky-700" />
        <span className="text-sky-800 font-medium">
          {isWhaleBuy ? 'Big Buy' : 'Big Sell'}
        </span>
      </div>
      <span className="text-sky-700">
        {formatAmount(usdValue, 0, true)}
        {isTrackedHolder && trackedTokenName && trackedTokenName !== trackedToken && (
          <span className="ml-1 text-sky-600">({trackedTokenName})</span>
        )}
      </span>
    </div>
  );
}

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
      className="ml-1 p-1 text-sky-600/70 hover:text-sky-800 rounded-full hover:bg-sky-100/50 transition-all duration-300"
    >
      {copied ? (
        <Check className="h-3 w-3" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

// Main page component
export default function FeedsPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackedTokens, setTrackedTokens] = useState<Record<string, any>>({});
  const [newEventSigs, setNewEventSigs] = useState<Set<string>>(new Set());
  const prevEventSigs = useRef<Set<string>>(new Set());

  // Fetch tracked tokens
  useEffect(() => {
    const fetchTrackedTokens = async () => {
      try {
        const response = await fetch('/api/solana/webhooks');
        if (!response.ok) {
          throw new Error('Failed to fetch webhooks');
        }
        const data = await response.json();
        
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
          }
        } catch (error) {
          console.error('Error fetching token batch:', error);
        }
      } catch (error) {
        console.error('Error fetching tracked tokens:', error);
      }
    };

    fetchTrackedTokens();
  }, []);

  // Fetch events with new event detection
  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch('/api/solana/webhook/events');
      if (!response.ok) {
        throw new Error(`Failed to fetch webhook events: ${response.status}`);
      }
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
      setError(null);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
      toast.error('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, [trackedTokens]);

  useEffect(() => {
    // Fetch initial events
    fetchEvents();

    // Set up polling every 30 seconds (matching webhook events page)
    const interval = setInterval(fetchEvents, 30000);

    return () => clearInterval(interval);
  }, [fetchEvents]);

  // Filter out unwanted events
  const filteredEvents = events.filter(event => {
    // Filter out swaps where user is selling tokens for SOL or USDC
    if (
      (event.toToken.symbol === 'SOL' && event.fromToken.symbol !== 'SOL') ||
      (event.toToken.symbol === 'USDC' && event.fromToken.symbol !== 'USDC')
    ) return false;
    
    return true;
  });

  const getEventColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'swap':
        return 'bg-blue-500/20 text-blue-300';
      case 'buy':
        return 'bg-green-500/20 text-green-300';
      case 'sell':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  return (
    <main className="w-full h-screen relative overflow-hidden">
      {/* Content container */}
      <div className="relative flex flex-col h-full max-h-screen" style={{ zIndex: 2 }}>
        {/* Fixed Header */}
        <div className="sticky top-0 z-20 px-6 py-4 bg-gradient-to-b from-sky-300/40 to-transparent backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-sky-900">Event Feed</h1>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 rounded-full">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-sm text-indigo-400 font-medium">Live Feed</span>
              </div>
              <button
                onClick={() => {
                  setLoading(true);
                  fetchEvents();
                }}
                className="flex items-center gap-2 px-3 py-1 bg-sky-100/50 hover:bg-sky-200/50 text-sky-900 rounded-full transition-colors"
                disabled={loading}
              >
                <svg
                  className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span className="text-sm font-medium">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 hide-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-900"></div>
              <p className="text-sky-900/60">Loading events...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
              <div className="bg-red-100/50 backdrop-blur-sm rounded-lg p-4 max-w-md">
                <p className="text-red-800 text-center">{error}</p>
                <button 
                  onClick={() => {
                    setLoading(true);
                    setError(null);
                    fetchEvents();
                  }}
                  className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors w-full"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
              <div className="bg-sky-100/50 backdrop-blur-sm rounded-lg p-4 max-w-md">
                <p className="text-sky-900/60 text-center">No events received yet</p>
                <p className="text-sky-900/40 text-sm text-center mt-2">Events will appear here as they are received</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {filteredEvents.map((event, index) => (
                <HolographicCard 
                  key={event.signature} 
                  className={`group hover:shadow-[0_8px_32px_rgba(186,230,253,0.3)] transition-all duration-300 ${
                    newEventSigs.has(event.signature) ? 'new-event-fade-in' : 'event-card'
                  }`}
                  style={{
                    animationDelay: newEventSigs.has(event.signature) ? '0s' : `${index * 0.1}s`
                  }}
                >
                  <div className="relative overflow-hidden rounded-lg transition-all duration-300">
                    {/* Content background with smoked glass effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-50/80 via-transparent to-sky-100/30 backdrop-blur-md" />
                    
                    {/* Content */}
                    <div className="relative p-6">
                      <div className="flex items-center gap-2 mb-3 w-full">
                        <TokenIcon 
                          symbol={event.tracked_token?.symbol || ''} 
                          logoURI={event.tracked_token?.logoURI}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sky-900 font-bold">
                                {event.tracked_token?.symbol?.toUpperCase()} Whale
                              </span>
                              <span className="text-sky-800 flex items-center gap-2">
                                just bought {formatAmount(event.toToken.amount)}{' '}
                                <div className="flex items-center gap-1">
                                  <TokenIcon 
                                    symbol={event.toToken.symbol}
                                    logoURI={event.toToken.metadata?.logoURI}
                                  />
                                  <span>{event.toToken.symbol}</span>
                                </div>
                                {event.toToken.usd_value && (
                                  <span className="text-sky-700">
                                    ({formatAmount(event.toToken.usd_value, 0, true)})
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <div className="text-xs text-sky-700 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {formatAddress(event.holder_address)}
                              <CopyButton text={event.holder_address} />
                            </div>
                            <div className="text-xs text-sky-600">
                              {formatDistanceToNow(new Date(event.timestamp * 1000), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <WhaleMovementNotification event={event} />
                      
                      <div className="mt-3 pt-3 border-t border-sky-200/50">
                        <a 
                          href={`https://solscan.io/tx/${event.signature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-sky-600 hover:text-sky-800 transition-colors flex items-center gap-1"
                        >
                          View on Solscan
                          <ArrowUpRight className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                </HolographicCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 