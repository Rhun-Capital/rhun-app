'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface WebhookEvent {
  signature: string;
  timestamp: number;
  type: string;
  description: string;
  accounts: string[];
  receivedAt: string;
  tokenInfo: {
    action?: string;
    fromToken?: {
      address?: string;
      amount?: number;
      symbol?: string;
    };
    toToken?: {
      address?: string;
      amount?: number;
      symbol?: string;
    };
  };
  fromTokenMetadata?: {
    symbol?: string;
    name?: string;
    logoURI?: string;
  };
  toTokenMetadata?: {
    symbol?: string;
    name?: string;
    logoURI?: string;
  };
}

export function WebhookEvents() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/solana/webhook');
        if (!response.ok) {
          throw new Error('Failed to fetch webhook events');
        }
        const data = await response.json();
        setEvents(data.events);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch events');
      }
    };

    // Fetch initial events
    fetchEvents();

    // Set up polling every 5 seconds
    const interval = setInterval(fetchEvents, 5000);

    return () => clearInterval(interval);
  }, []);

  const getEventColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'swap':
        return 'bg-blue-500 text-white';
      case 'buy':
        return 'bg-green-500 text-white';
      case 'sell':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const formatAmount = (amount?: number) => {
    if (amount === undefined) return '';
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-4">Webhook Events</h2>
      {error && (
        <div className="text-red-500 mb-4">
          Error: {error}
        </div>
      )}
      <div className="h-[600px] overflow-y-auto pr-2">
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.signature}
              className="p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getEventColor(event.tokenInfo.action || '')}`}>
                  {event.tokenInfo.action?.toUpperCase() || event.type}
                </span>
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(event.receivedAt), { addSuffix: true })}
                </span>
              </div>
              
              <p className="text-sm mb-2">{event.description}</p>
              
              {event.tokenInfo.fromToken && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">From:</span>
                  <span>{formatAmount(event.tokenInfo.fromToken.amount)}</span>
                  <span>{event.fromTokenMetadata?.symbol || event.tokenInfo.fromToken.symbol}</span>
                </div>
              )}
              
              {event.tokenInfo.toToken && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">To:</span>
                  <span>{formatAmount(event.tokenInfo.toToken.amount)}</span>
                  <span>{event.toTokenMetadata?.symbol || event.tokenInfo.toToken.symbol}</span>
                </div>
              )}
              
              <div className="mt-2">
                <p className="text-xs text-gray-500">
                  Signature: {event.signature.slice(0, 8)}...{event.signature.slice(-8)}
                </p>
              </div>
            </div>
          ))}
          
          {events.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No events received yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 