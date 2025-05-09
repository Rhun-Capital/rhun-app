'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import Image from 'next/image';
import { Copy, Check, User, ChevronDown, ArrowUpRight, ArrowRight, ArrowUp, ArrowDown, ExternalLink, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { createPortal } from 'react-dom';
import { useModal } from '@/contexts/modal-context';

interface TokenMetadata {
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  marketCap?: number;
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
    token_logo_uri?: string;
    token_decimals?: number;
  } | null;
  swap_value_usd?: number;
}

// Update the formatAmount function to default to decimals=0 for human-readable values
const formatAmount = (amount: number, decimals: number = 0, isUSD: boolean = false) => {
  if (isUSD) {
    // Handle amounts in millions (M)
    if (amount >= 1000000) {
      const roundedM = Math.round(amount / 1000000);
      return `$${roundedM}M`;
    }
    // Handle amounts in thousands (K)
    if (amount >= 1000) {
      const roundedK = Math.round(amount / 1000);
      return `$${roundedK}K`;
    }
    // For amounts under 1000, round to nearest 100
    if (amount >= 100) {
      return `$${Math.round(amount / 100) * 100}`;
    }
    // For small amounts, show two decimal places
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  // Non-USD formatting (original logic)
  if (amount < 0.0001 && amount > 0) {
    return amount.toFixed(8).replace(/\.?0+$/, '');
  }
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6
  });
};

// First, let's add a new function for exact USD formatting
const formatExactAmount = (amount: number, isUSD: boolean = false) => {
  if (isUSD) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
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

function formatAddress(address?: string | null): string {
  if (!address || typeof address !== 'string') return '';
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

  // If image failed to load or no logoURI, show the whale emoji or letter circle
  if (imageError || !logoURI) {
    return (
      <div className="inline-flex w-8 h-8 rounded-full items-center justify-center bg-blue-500/20 text-lg">
        {logoURI ? firstLetter : '🐋'}
      </div>
    );
  }

  // Try to load the image
  return (
    <div className="inline-flex w-8 h-8 rounded-full">
      <Image
        src={logoURI}
        alt={symbol}
        width={32}
        height={32}
        className="rounded-full"
        onError={() => setImageError(true)}
      />
    </div>
  );
}

function WhaleEventHeader({ event }: { event: WebhookEvent }) {
  const tokenSymbol = event.holder_mapping?.token_symbol || event.tracked_token?.symbol;
  const tokenName = event.holder_mapping?.token_name || event.tracked_token?.name;
  const logoURI = event.holder_mapping?.token_logo_uri || event.tracked_token?.logoURI;
  
  // Determine if this is a sell event (when receiving USDC or SOL)
  const toTokenSymbol = event.toToken.metadata?.symbol || event.toToken.symbol;
  const isSellEvent = toTokenSymbol.toUpperCase() === 'USDC' || toTokenSymbol.toUpperCase() === 'SOL';
  
  console.log('Event Debug:', {
    fromToken: {
      symbol: event.fromToken.symbol,
      metadata: event.fromToken.metadata,
      amount: event.fromToken.amount,
      usd_value: event.fromToken.usd_value
    },
    toToken: {
      symbol: event.toToken.symbol,
      metadata: event.toToken.metadata,
      amount: event.toToken.amount,
      usd_value: event.toToken.usd_value
    },
    isSellEvent
  });
  
  // Get the correct amount and token for display
  const displayAmount = isSellEvent ? event.fromToken.usd_value : event.toToken.usd_value;
  
  // For sells, we want to show the token being sold (fromToken)
  // For buys, we want to show the token being bought (toToken)
  const actionToken = isSellEvent ? event.fromToken : event.toToken;

  return (
    <div className="flex items-center gap-2 mb-3 w-full">
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Whale section */}
            <div className="flex items-center gap-2">
              <TokenIcon 
                symbol={tokenSymbol || ''} 
                logoURI={logoURI}
              />
              <div className="flex flex-col">
                <span className="text-yellow-400 font-bold">
                  {tokenSymbol?.toUpperCase()} Whale
                </span>
                <span className="text-gray-300 text-sm">
                  {isSellEvent ? 'Sold' : 'Bought'} {formatAmount(displayAmount || 0, 0, true)}
                  {isSellEvent ? ` of ${actionToken.metadata?.symbol?.toUpperCase() || actionToken.symbol.toUpperCase()}` : ''}
                </span>
              </div>
            </div>

            {/* Arrow */}
            <div className={`${isSellEvent ? 'text-red-400' : 'text-green-400'}`}>
              {isSellEvent ? (
                <ArrowDown className="w-5 h-5" />
              ) : (
                <ArrowUp className="w-5 h-5" />
              )}
            </div>

            {/* Action token section (bought/sold token) */}
            <div className="flex items-center gap-2">
              <TokenIcon 
                symbol={actionToken.symbol}
                logoURI={actionToken.metadata?.logoURI}
              />
              <div className="flex flex-col">
                <div>{actionToken.metadata?.symbol?.toUpperCase() || actionToken.symbol.toUpperCase()}</div>
                {actionToken.metadata?.marketCap && (
                  <div className="text-xs text-gray-500">{formatAmount(actionToken.metadata.marketCap, 0, true)} Market Cap</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 mt-2">
          <WhaleMovementNotification event={event} />
          <div className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(event.timestamp * 1000), { addSuffix: true })}
          </div>
        </div>
      </div>
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

  // Determine if this is a sell event (when receiving USDC or SOL)
  console.log('Event:', event);
  const toTokenSymbol = event.toToken.metadata?.symbol || event.toToken.symbol;
  console.log('To Token Symbol:', toTokenSymbol);
  const isSellEvent = toTokenSymbol.toUpperCase() === 'USDC' || toTokenSymbol.toUpperCase() === 'SOL';
  const isWhaleBuy = !isSellEvent && isWhaleMovement(event.toToken.amount, event.toToken.symbol);
  const isWhaleSell = isSellEvent && isWhaleMovement(event.fromToken.amount, event.fromToken.symbol);

  if (!isWhaleBuy && !isWhaleSell) return null;

  // Get the token being tracked for this holder
  const trackedToken = event.holder_mapping?.token_symbol || event.tracked_token?.symbol;
  const trackedTokenName = event.holder_mapping?.token_name || event.tracked_token?.name;
  const isTrackedHolder = !!trackedToken;

  const usdValue = isSellEvent ? event.fromToken.usd_value : event.toToken.usd_value;
  if (!usdValue) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${
        isSellEvent 
          ? 'bg-red-500/10 text-red-400' 
          : 'bg-green-500/10 text-green-400'
      }`}>
        {isSellEvent ? (
          <ArrowDown className="w-4 h-4" />
        ) : (
          <ArrowUp className="w-4 h-4" />
        )}
        <span className="font-medium">
          {isSellEvent ? 'Big Sell' : 'Big Buy'}
        </span>
      </div>
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

function getTokenName(token: Token) {
  if (token.symbol === 'SOL') return 'Solana';
  return token.metadata?.name || token.symbol;
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
}

function EventAccordion({ event }: { event: WebhookEvent }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toTokenSymbol = event.toToken.metadata?.symbol || event.toToken.symbol;
  const fromTokenSymbol = event.fromToken.metadata?.symbol || event.fromToken.symbol;
  const isSellEvent = toTokenSymbol.toUpperCase() === 'USDC' || toTokenSymbol.toUpperCase() === 'SOL';

  return (
    <div className="bg-zinc-800 rounded-lg border border-zinc-700 hover:border-indigo-500/50 transition-all duration-300 group">
      <div className="relative z-10">
        {/* Main whale buy info - always visible */}
        <div 
          className="flex items-center justify-between cursor-pointer p-4"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <WhaleEventHeader event={event} />
          <button 
            className={`p-2 hover:bg-gray-700/50 rounded-full transition-all ${isExpanded ? 'rotate-180' : ''}`}
            aria-label="Toggle details"
          >
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Expandable details */}
        <div 
          className={`overflow-hidden transition-all duration-200 ease-in-out ${
            isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-4 pb-4 space-y-4">
            {/* Token transfer details */}
            <div className="space-y-2">
              <div className="flex items-center space-x-4">
                {/* From Token */}
                <div className="flex items-center space-x-2">
                  <TokenIcon 
                    symbol={fromTokenSymbol}
                    logoURI={event.fromToken.metadata?.logoURI}
                  />
                  <div>
                    <div className="font-medium">
                      {formatAmount(event.fromToken.amount)}
                    </div>
                    <div className="text-sm text-gray-400">{getTokenName(event.fromToken)}</div>
                    {event.fromToken.usd_value && (
                      <div className="text-xs text-gray-500">
                        {formatExactAmount(event.fromToken.usd_value, true)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <div className="text-gray-400">→</div>

                {/* To Token */}
                <div className="flex items-center space-x-2">
                  <TokenIcon 
                    symbol={toTokenSymbol}
                    logoURI={event.toToken.metadata?.logoURI}
                  />
                  <div>
                    <div className="font-medium">
                      {formatAmount(event.toToken.amount)}
                    </div>
                    <div className="text-sm text-gray-400">{getTokenName(event.toToken)}</div>
                    {event.toToken.usd_value && (
                      <div className="text-xs text-gray-500">
                        {formatExactAmount(event.toToken.usd_value, true)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Timestamp and holder address */}
              <div className="pl-10 space-y-2">
                <div className="text-sm text-gray-400">
                  {formatTime(event.timestamp)}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <div className="flex items-center gap-1 text-gray-400 text-xs whitespace-nowrap">
                    <span className="truncate">{formatAddress(event.holder_address)}</span>
                    {event.holder_address && <CopyButton text={event.holder_address} />}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with additional info */}
            <div className="flex items-center justify-end pt-2 border-t border-gray-700/50">
              <a 
                href={`https://solscan.io/tx/${event.signature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
              >
                View on Solscan
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add AnalysisPanel component before the main WebhookEventsPage component
function AnalysisPanel({ events }: { events: WebhookEvent[] }) {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastAnalyzedKeyRef = useRef<string>('');
  const isFirstRender = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const analysisTimeoutRef = useRef<NodeJS.Timeout>();
  const lastAnalysisTimeRef = useRef<number>(0);
  const isAnalyzing = useRef(false);

  // Calculate statistics from events
  const getTradeStats = (events: WebhookEvent[]) => {
    const stats = {
      totalVolume: 0,
      totalTrades: events.length,
      uniqueWhales: new Set<string>(),
      tokensBought: {} as Record<string, { count: number, volume: number }>,
      tokensSold: {} as Record<string, { count: number, volume: number }>,
      largestTrades: [] as Array<{ symbol: string, value: number, type: 'buy' | 'sell' }>,
      whaleGroups: {} as Record<string, {
        trades: number,
        volume: number,
        buys: number,
        sells: number,
        tokens: Set<string>
      }>
    };

    events.forEach(event => {
      // Track unique whales
      stats.uniqueWhales.add(event.holder_address);

      // Get whale group
      const whaleToken = event.tracked_token?.symbol || event.holder_mapping?.token_symbol || 'Unknown';
      if (!stats.whaleGroups[whaleToken]) {
        stats.whaleGroups[whaleToken] = {
          trades: 0,
          volume: 0,
          buys: 0,
          sells: 0,
          tokens: new Set<string>()
        };
      }

      // Determine if this is a sell event (when receiving USDC or SOL)
      const toTokenSymbol = event.toToken.metadata?.symbol || event.toToken.symbol;
      const isSellEvent = toTokenSymbol.toUpperCase() === 'USDC' || toTokenSymbol.toUpperCase() === 'SOL';
      
      // Calculate trade value (use the larger of from/to values)
      const tradeValue = Math.max(
        event.fromToken.usd_value || 0,
        event.toToken.usd_value || 0
      );
      
      // Update total volume
      stats.totalVolume += tradeValue;
      
      // Update whale group stats
      const group = stats.whaleGroups[whaleToken];
      group.trades += 1;
      group.volume += tradeValue;
      if (isSellEvent) {
        group.sells += 1;
        group.tokens.add(event.fromToken.symbol);
        
        // Track sold tokens
        const symbol = event.fromToken.metadata?.symbol || event.fromToken.symbol;
        if (!stats.tokensSold[symbol]) {
          stats.tokensSold[symbol] = { count: 0, volume: 0 };
        }
        stats.tokensSold[symbol].count += 1;
        stats.tokensSold[symbol].volume += tradeValue;
      } else {
        group.buys += 1;
        group.tokens.add(event.toToken.symbol || '');
        
        // Track bought tokens
        const symbol = event.toToken.metadata?.symbol || event.toToken.symbol || '';
        if (!stats.tokensBought[symbol]) {
          stats.tokensBought[symbol] = { count: 0, volume: 0 };
        }
        stats.tokensBought[symbol].count += 1;
        stats.tokensBought[symbol].volume += tradeValue;
      }

      // Track largest trades
      stats.largestTrades.push({
        symbol: isSellEvent ? event.fromToken.metadata?.symbol || event.fromToken.symbol : event.toToken.metadata?.symbol || event.toToken.symbol,
        value: tradeValue,
        type: isSellEvent ? 'sell' : 'buy'
      });
    });

    // Sort largest trades and keep top 5
    stats.largestTrades.sort((a, b) => b.value - a.value);
    stats.largestTrades = stats.largestTrades.slice(0, 5);

    return stats;
  };

  const stats = getTradeStats(events);

  // Sort tokens by volume
  const topBoughtTokens = Object.entries(stats.tokensBought)
    .sort(([,a], [,b]) => b.volume - a.volume)
    .slice(0, 5);

  const topSoldTokens = Object.entries(stats.tokensSold)
    .sort(([,a], [,b]) => b.volume - a.volume)
    .slice(0, 5);

  // Sort whale groups by volume
  const sortedWhaleGroups = Object.entries(stats.whaleGroups)
    .sort(([,a], [,b]) => b.volume - a.volume);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const processStream = async (response: Response) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    let content = '';
    
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          try {
            const data = JSON.parse(line);
            if (data.type === 'text') {
              content += data.value;
              setMessages(prev => {
                const newMessages = [...prev];
                if (newMessages.length > 0) {
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content
                  };
                }
                return newMessages;
              });
            }
          } catch (e) {
            console.error('Error parsing streaming response:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error processing stream:', error);
      throw error;
    }
  };

  const generateAnalysis = useCallback(async () => {
    if (isAnalyzing.current || events.length === 0) return;
    
    const now = Date.now();
    if (now - lastAnalysisTimeRef.current < 30000) {
      return;
    }
    
    const currentEventKey = events
      .map(e => e.signature)
      .sort()
      .join('|');
    
    if (currentEventKey === lastAnalyzedKeyRef.current) {
      return;
    }
    
    setLoading(true);
    setError(null);
    isAnalyzing.current = true;
    
    try {
      const initialMessage = `Analyze these whale trading events and provide insights for traders. Focus on:

1. Which tokens are being accumulated by different whale groups
2. Notable trading patterns or repeated buys
3. Potential new tokens or projects gaining whale attention
4. Risk assessment of following these trades

Key Stats:
- Total Volume: ${formatAmount(stats.totalVolume, 0, true)}
- Active Whales: ${stats.uniqueWhales.size}
- Most Bought: ${topBoughtTokens.map(([symbol, data]) => `${symbol} (${formatAmount(data.volume, 0, true)})`).join(', ')}
- Most Sold: ${topSoldTokens.map(([symbol, data]) => `${symbol} (${formatAmount(data.volume, 0, true)})`).join(', ')}

Provide actionable insights for traders looking to identify early opportunities.`;
      
      const response = await fetch('/api/chat/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: initialMessage }],
          context: { events }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate analysis: ${response.status}`);
      }
      
      await processStream(response);
      lastAnalyzedKeyRef.current = currentEventKey;
      lastAnalysisTimeRef.current = now;
    } catch (error) {
      console.error('Analysis generation failed:', error);
      setError('Failed to generate analysis');
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      retryTimeoutRef.current = setTimeout(() => {
        isAnalyzing.current = false;
        generateAnalysis();
      }, 5000);
    } finally {
      setLoading(false);
      isAnalyzing.current = false;
    }
  }, [events, stats, topBoughtTokens, topSoldTokens]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    analysisTimeoutRef.current = setTimeout(() => {
      if (!isAnalyzing.current) {
        generateAnalysis();
      }
    }, 1000);
    
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
    };
  }, [generateAnalysis]);

  return (
    <div className="w-96 border-l border-zinc-800 flex flex-col h-full">
      <div className="p-6 border-b border-zinc-800">
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">Whale Activity Summary</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-emerald-400 font-medium">Live Stats & Analysis</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Overall Stats */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-400">Overall Activity</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700 hover:border-emerald-500/50 transition-all duration-300 group">
                <div className="relative z-10">
                  <div className="text-2xl font-bold text-white">
                    {formatAmount(stats.totalVolume, 0, true)}
                  </div>
                  <div className="text-xs text-zinc-400">Total Volume</div>
                </div>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700 hover:border-emerald-500/50 transition-all duration-300 group">
                <div className="relative z-10">
                  <div className="text-2xl font-bold text-white">
                    {stats.uniqueWhales.size}
                  </div>
                  <div className="text-xs text-zinc-400">Active Whales</div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-400">AI Analysis</h3>
            <div className="space-y-4">
              {loading ? (
                <div className="bg-zinc-800 rounded-lg flex items-center justify-center py-8 gap-3 border border-zinc-700 hover:border-emerald-500/50 transition-all duration-300 group">
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400" />
                    <span className="text-sm text-emerald-400 mt-2">Analyzing patterns...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="bg-zinc-800 rounded-lg flex flex-col items-center justify-center py-8 text-red-400 border border-zinc-700 hover:border-red-500/50 transition-all duration-300 group">
                  <div className="relative z-10 flex flex-col items-center">
                    <XCircle className="w-8 h-8 mb-2" />
                    <p className="text-sm text-center">{error}</p>
                    <button 
                      onClick={() => {
                        setError(null);
                        generateAnalysis();
                      }}
                      className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm transition-colors"
                    >
                      Retry Analysis
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`bg-zinc-800 rounded-lg p-4 border border-zinc-700 hover:border-emerald-500/50 transition-all duration-300 group ${
                        index === messages.length - 1 ? 'animate-fade-in' : ''
                      }`}
                    >
                      <div className="relative z-10 text-sm whitespace-pre-wrap text-zinc-300">
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Whale Groups */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-400">Top Whale Groups</h3>
            <div className="space-y-2">
              {sortedWhaleGroups.map(([token, stats]) => (
                <div key={token} className="bg-zinc-800 rounded-lg p-3 border border-zinc-700 hover:border-indigo-500/50 transition-all duration-300 group">
                  <div className="relative z-10 flex justify-between items-start">
                    <div>
                      <div className="font-medium text-white">{token}</div>
                      <div className="text-xs text-zinc-400">
                        {stats.trades} trades ({stats.buys} buys, {stats.sells} sells)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-white">
                        {formatAmount(stats.volume, 0, true)}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {stats.tokens.size} tokens traded
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Bought/Sold Tokens */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-zinc-400">Most Bought</h3>
              <div className="space-y-2">
                {topBoughtTokens.map(([symbol, data]) => (
                  <div key={symbol} className="bg-zinc-800 rounded-lg p-3 border border-zinc-700 hover:border-emerald-500/50 transition-all duration-300 group">
                    <div className="relative z-10 flex justify-between items-start">
                      <div>
                        <div className="font-medium text-white">{symbol}</div>
                        <div className="text-xs text-zinc-400">{data.count} buys</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-emerald-400">
                          {formatAmount(data.volume, 0, true)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-zinc-400">Most Sold</h3>
              <div className="space-y-2">
                {topSoldTokens.map(([symbol, data]) => (
                  <div key={symbol} className="bg-zinc-800 rounded-lg p-3 border border-zinc-700 hover:border-red-500/50 transition-all duration-300 group">
                    <div className="relative z-10 flex justify-between items-start">
                      <div>
                        <div className="font-medium text-white">{symbol}</div>
                        <div className="text-xs text-zinc-400">{data.count} sells</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-red-400">
                          {formatAmount(data.volume, 0, true)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add this before the TradeDetailModal component
const ModalPortal = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return mounted ? createPortal(children, document.body) : null;
};

function TradeDetailModal({ 
  event, 
  isOpen, 
  onClose 
}: { 
  event: WebhookEvent | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { openModal, closeModal } = useModal();

  useEffect(() => {
    if (isOpen) {
      openModal();
    }
    return () => {
      closeModal();
    };
  }, [isOpen, openModal, closeModal]);

  if (!event || !isOpen) return null;

  const handleClose = () => {
    closeModal();
    onClose();
  };

  const toTokenSymbol = event.toToken.metadata?.symbol || event.toToken.symbol;
  const fromTokenSymbol = event.fromToken.metadata?.symbol || event.fromToken.symbol;
  const isSellEvent = toTokenSymbol.toUpperCase() === 'USDC' || toTokenSymbol.toUpperCase() === 'SOL';
  const tradeValue = Math.max(
    event.fromToken.usd_value || 0,
    event.toToken.usd_value || 0
  );

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999]">
        <div className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-2xl overflow-hidden">
          {/* Header */}
          <div className="border-b border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <TokenIcon 
                    symbol={event.holder_mapping?.token_symbol || event.tracked_token?.symbol || ''} 
                    logoURI={event.holder_mapping?.token_logo_uri || event.tracked_token?.logoURI}
                  />
                  <div className="flex flex-col">
                    <span className="text-yellow-400 font-bold">
                      {(event.holder_mapping?.token_symbol || event.tracked_token?.symbol || '').toUpperCase()} Whale
                    </span>
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <span className="truncate">{formatAddress(event.holder_address)}</span>
                      {event.holder_address && <CopyButton text={event.holder_address} />}
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={handleClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Trade Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Trade Details</h3>
              <div className="bg-zinc-800/50 rounded-lg p-4 space-y-4">
                {/* Trade Type */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Type</span>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    isSellEvent 
                      ? 'bg-red-500/10 text-red-400' 
                      : 'bg-green-500/10 text-green-400'
                  }`}>
                    {isSellEvent ? 'SELL' : 'BUY'}
                  </span>
                </div>

                {/* Value */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Value</span>
                  <span className="font-medium">{formatAmount(tradeValue, 0, true)}</span>
                </div>

                {/* Time */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Time</span>
                  <span>{formatDistanceToNow(new Date(event.timestamp * 1000), { addSuffix: true })}</span>
                </div>
              </div>

              {/* Token Details */}
              <div className="grid grid-cols-2 gap-4">
                {/* From Token */}
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TokenIcon 
                      symbol={fromTokenSymbol}
                      logoURI={event.fromToken.metadata?.logoURI}
                    />
                    <span className="font-medium">From</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Amount</span>
                      <span>{formatAmount(event.fromToken.amount)} {fromTokenSymbol}</span>
                    </div>
                    {event.fromToken.usd_value && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">USD Value</span>
                        <span>{formatExactAmount(event.fromToken.usd_value, true)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* To Token */}
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TokenIcon 
                      symbol={toTokenSymbol}
                      logoURI={event.toToken.metadata?.logoURI}
                    />
                    <span className="font-medium">To</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Amount</span>
                      <span>{formatAmount(event.toToken.amount)} {toTokenSymbol}</span>
                    </div>
                    {event.toToken.usd_value && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">USD Value</span>
                        <span>{formatExactAmount(event.toToken.usd_value, true)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <a 
                href={`https://solscan.io/tx/${event.signature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
              >
                View on Solscan
                <ExternalLink className="w-4 h-4" />
              </a>
              <button 
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                onClick={() => {
                  // TODO: Implement swap functionality
                  console.log('Swap clicked');
                }}
              >
                Make Similar Trade
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function EventsTable({ events }: { events: WebhookEvent[] }) {
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-800">
            <tr>
              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-left">Whale</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">From</th>
              <th className="px-4 py-3 text-left">To</th>
              <th className="px-4 py-3 text-left">Value</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {events.map((event) => {
              const toTokenSymbol = event.toToken.metadata?.symbol || event.toToken.symbol;
              const fromTokenSymbol = event.fromToken.metadata?.symbol || event.fromToken.symbol;
              const isSellEvent = toTokenSymbol.toUpperCase() === 'USDC' || toTokenSymbol.toUpperCase() === 'SOL';
              const tradeValue = Math.max(
                event.fromToken.usd_value || 0,
                event.toToken.usd_value || 0
              );

              return (
                <tr 
                  key={event.signature} 
                  className="hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedEvent(event)}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDistanceToNow(new Date(event.timestamp * 1000), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <TokenIcon 
                          symbol={event.holder_mapping?.token_symbol || event.tracked_token?.symbol || ''} 
                          logoURI={event.holder_mapping?.token_logo_uri || event.tracked_token?.logoURI}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-yellow-400 font-medium text-xs">
                            {(event.holder_mapping?.token_symbol || event.tracked_token?.symbol || '').toUpperCase()} Whale
                          </span>
                          <div className="flex items-center gap-1 text-gray-400 text-xs whitespace-nowrap">
                            <span className="truncate">{formatAddress(event.holder_address)}</span>
                            {event.holder_address && <CopyButton text={event.holder_address} />}
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      isSellEvent 
                        ? 'bg-red-500/10 text-red-400' 
                        : 'bg-green-500/10 text-green-400'
                    }`}>
                      {isSellEvent ? 'SELL' : 'BUY'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <TokenIcon 
                        symbol={fromTokenSymbol}
                        logoURI={event.fromToken.metadata?.logoURI}
                      />
                      <div>
                        <div>{formatAmount(event.fromToken.amount)} {fromTokenSymbol}</div>
                        <div className="text-xs text-gray-400">
                          {event.fromToken.usd_value ? formatAmount(event.fromToken.usd_value, 0, true) : '-'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <TokenIcon 
                        symbol={toTokenSymbol}
                        logoURI={event.toToken.metadata?.logoURI}
                      />
                      <div>
                        <div>{formatAmount(event.toToken.amount)} {toTokenSymbol}</div>
                        <div className="text-xs text-gray-400">
                          {event.toToken.usd_value ? formatAmount(event.toToken.usd_value, 0, true) : '-'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {formatAmount(tradeValue, 0, true)}
                  </td>
                  <td className="px-4 py-3">
                    <a 
                      href={`https://solscan.io/tx/${event.signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                    >
                      View
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TradeDetailModal 
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </>
  );
}

export default function WebhookEventsPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackedTokens, setTrackedTokens] = useState<Record<string, any>>({});
  const [newEventSigs, setNewEventSigs] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const prevEventSigs = useRef<Set<string>>(new Set());
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout>();
  const lastFetchTimeRef = useRef<number>(0);

  // Debounced fetch function to prevent multiple rapid calls
  const fetchEvents = useCallback(async (force: boolean = false) => {
    const now = Date.now();
    // Prevent fetching more often than every 10 seconds unless forced
    if (!force && now - lastFetchTimeRef.current < 10000) {
      return;
    }

    try {
      const response = await fetch('/api/solana/webhook/events');
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      
      // Convert current events to Set for comparison
      const currentSigs = new Set<string>((data.events || []).map((e: WebhookEvent) => e.signature));
      
      // Only process if we have new events
      if (force || Array.from(currentSigs).some(sig => !prevEventSigs.current.has(sig))) {
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
      }
      
      lastFetchTimeRef.current = now;
    } catch (error) {
      console.error('Failed to fetch events:', error);
      toast.error('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, [trackedTokens]);

  // Initial fetch of tracked tokens
  useEffect(() => {
    const fetchTrackedTokens = async () => {
      try {
        const response = await fetch('/api/solana/webhooks');
        if (!response.ok) {
          throw new Error('Failed to fetch webhooks');
        }
        const data = await response.json();
        
        if (!data.webhooks?.length) {
          setTrackedTokens({});
          return;
        }

        // Batch fetch token info
        const allAddresses = new Set<string>();
        data.webhooks.forEach((webhook: any) => {
          if (webhook.accountAddresses?.length) {
            webhook.accountAddresses.forEach((address: string) => {
              allAddresses.add(address);
            });
          }
        });

        if (allAddresses.size === 0) {
          setTrackedTokens({});
          return;
        }

        const batchResponse = await fetch('/api/solana/webhook/events/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addresses: Array.from(allAddresses) })
        });

        if (batchResponse.ok) {
          const batchData = await batchResponse.json();
          setTrackedTokens(batchData.tokens || {});
        }
      } catch (error) {
        console.error('Error fetching tracked tokens:', error);
        setTrackedTokens({});
      }
    };

    fetchTrackedTokens();
  }, []);

  // Set up polling for events
  useEffect(() => {
    // Initial fetch
    fetchEvents(true);

    // Set up interval
    const interval = setInterval(() => {
      fetchEvents(false);
    }, 30000);

    return () => {
      clearInterval(interval);
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [fetchEvents]);

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
    // Keep all USDC/SOL trades (both buys and sells)
    if (event.toToken.symbol === 'USDC' || event.toToken.symbol === 'SOL' ||
        event.fromToken.symbol === 'USDC' || event.fromToken.symbol === 'SOL') {
      return true;
    }
    
    // Apply token filter if any tokens are selected
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
    <div className="container mx-auto h-screen flex">
      {/* Main content */}
      <div className="flex-1 px-4 py-8 flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Swap Events</h1>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 rounded-full">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-sm text-indigo-400 font-medium">Live Feed</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-zinc-800/50 rounded-lg border border-zinc-700 p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  viewMode === 'cards' 
                    ? 'bg-indigo-500 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-indigo-500 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Table
              </button>
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
                <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-zinc-800 rounded-lg shadow-lg border border-zinc-700 z-50">
                  <div className="p-2 space-y-1">
                    {CURATED_TOKENS.map((token: TokenOption) => (
                      <button
                        key={token.address}
                        onClick={() => toggleToken(token.address)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-zinc-700 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <TokenIcon symbol={token.symbol} logoURI={token.logoURI} />
                          <span className="text-sm text-gray-300">{token.symbol}</span>
                        </div>
                        <div className={`w-4 h-4 rounded border ${
                          selectedTokens.includes(token.address)
                            ? 'bg-indigo-500 border-indigo-500'
                            : 'border-gray-500'
                        }`}>
                          {selectedTokens.includes(token.address) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Events List */}
        <div className="flex-1 overflow-y-auto">
          {viewMode === 'cards' ? (
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <EventAccordion key={event.signature} event={event} />
              ))}
            </div>
          ) : (
            <EventsTable events={filteredEvents} />
          )}
        </div>
      </div>

      {/* Analysis Panel */}
      <AnalysisPanel events={events} />
    </div>
  );
}