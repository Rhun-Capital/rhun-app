"use client";

import { useState, useEffect } from "react";
import { TokenHolding } from "@/types";
import LoadingIndicator from "@/components/loading-indicator";

interface PortfolioMetrics {
  totalValue: number;
  totalChange24h: number;
  changePercentage24h: number;
}

export function PortfolioAnalysis({
  walletAddress,
}: {
  walletAddress: string;
}) {
  const [holdings, setHoldings] = useState<TokenHolding[]>([]);
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simulate some sample data for the UI
  useEffect(() => {
    const sampleData = {
      holdings: [
        {
          mint: "SOL",
          name: "Solana",
          symbol: "SOL",
          amount: 12.5,
          usdValue: 1250.00,
          priceChange24h: 2.5,
          logoURI: "https://solana.com/logo.png"
        },
        {
          mint: "USDC",
          name: "USD Coin",
          symbol: "USDC",
          amount: 500,
          usdValue: 500,
          priceChange24h: 0.01,
          logoURI: "https://usdc.com/logo.png"
        }
      ]
    };

    setHoldings(sampleData.holdings);
    const totalValue = sampleData.holdings.reduce(
      (sum, token) => sum + token.usdValue,
      0
    );
    const totalChange24h = sampleData.holdings.reduce(
      (sum, token) => sum + (token.usdValue * token.priceChange24h) / 100,
      0
    );

    setMetrics({
      totalValue,
      totalChange24h,
      changePercentage24h: (totalChange24h / totalValue) * 100,
    });
    setLoading(false);
  }, []);

  if (loading) {
    return <LoadingIndicator />;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-900/50 border border-red-500 rounded-lg">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Coming Soon Overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-zinc-900/50 z-10 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-3xl font-bold text-white mb-2">Coming Soon</h3>
          <p className="text-zinc-400">Portfolio tracking is under development</p>
        </div>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-zinc-800 rounded-lg">
          <h3 className="text-sm text-zinc-400 mb-2">Portfolio Value</h3>
          <p className="text-2xl font-bold">
            ${metrics?.totalValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="p-6 bg-zinc-800 rounded-lg">
          <h3 className="text-sm text-zinc-400 mb-2">24h Change</h3>
          <p
            className={`text-2xl font-bold ${
              metrics?.changePercentage24h! >= 0
                ? "text-green-500"
                : "text-red-500"
            }`}
          >
            {metrics?.changePercentage24h.toFixed(2)}%
          </p>
        </div>
        <div className="p-6 bg-zinc-800 rounded-lg">
          <h3 className="text-sm text-zinc-400 mb-2">Holdings</h3>
          <p className="text-2xl font-bold">{holdings.length}</p>
        </div>
      </div>

      <hr className="opacity-30"/>

      {/* Holdings Table */}
      {holdings.map(token => (
        <div key={token.mint} className="flex justify-between items-center p-4 bg-zinc-800 rounded-lg">
          <div className="flex items-center gap-4">
            {token.logoURI ? (
              <img 
                src={token.logoURI} 
                alt={token.symbol}
                className="w-8 h-8 rounded-full"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const nextSibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (nextSibling) {
                    nextSibling.style.display = 'flex';
                  }
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                <span className="text-xs text-zinc-300">?</span>
              </div>
            )}
            <div>
              <p className="font-medium">{token.name}</p>
              <p className="text-sm text-zinc-400">
                {token.amount.toLocaleString(undefined, { 
                  maximumFractionDigits: 4 
                })} {token.symbol}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium">
              ${token.usdValue.toLocaleString(undefined, { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2 
              })}
            </p>
            <p className={`text-sm ${
              token.priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {token.priceChange24h.toFixed(2)}%
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}