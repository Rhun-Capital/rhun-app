'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, AlertTriangle } from 'lucide-react';

interface TokenDetailPanelProps {
  tokenAddress: string;
  tokenData: any;
}

export default function TokenDetailPanel({ tokenAddress, tokenData }: TokenDetailPanelProps) {
  const [tradingSignals, setTradingSignals] = useState<any>({
    momentum: calculateMomentumScore(tokenData),
    liquidity: calculateLiquidityScore(tokenData),
    buyPressure: calculateBuyPressureScore(tokenData),
    volatility: calculateVolatilityScore(tokenData),
    overall: 0
  });
  
  // Calculate overall score when component mounts or signals change
  useEffect(() => {
    const overall = Math.round(
      (tradingSignals.momentum + tradingSignals.liquidity + tradingSignals.buyPressure + tradingSignals.volatility) / 4
    );
    setTradingSignals((prev: typeof tradingSignals) => ({ ...prev, overall }));
  }, [tradingSignals.momentum, tradingSignals.liquidity, tradingSignals.buyPressure, tradingSignals.volatility]);

  // Format large numbers
  const formatNumber = (num: number | undefined, precision: number = 2) => {
    if (num === undefined) return 'N/A';
    if (num >= 1e9) return `${(num / 1e9).toFixed(precision)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(precision)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(precision)}K`;
    return num.toFixed(precision);
  };

  // Format price with appropriate precision based on value
  const formatPrice = (price: number | undefined) => {
    if (price === undefined) return 'N/A';
    if (price < 0.0001) return `$${price.toExponential(2)}`;
    if (price < 0.01) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    if (price < 10) return `$${price.toFixed(3)}`;
    if (price < 1000) return `$${price.toFixed(2)}`;
    return formatNumber(price);
  };

  // Format percentage changes
  const formatPercent = (value: number | undefined) => {
    if (value === undefined) return 'N/A';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Get color for percentage changes
  const getChangeColor = (value: number | undefined) => {
    if (value === undefined) return '';
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return '';
  };

  // Get signal level indicator text and color
  const getSignalIndicator = (score: number) => {
    if (score >= 80) return { text: 'Strong Buy', color: 'text-green-500' };
    if (score >= 60) return { text: 'Buy', color: 'text-green-400' };
    if (score >= 40) return { text: 'Neutral', color: 'text-yellow-400' };
    if (score >= 20) return { text: 'Sell', color: 'text-red-400' };
    return { text: 'Strong Sell', color: 'text-red-500' };
  };

  if (!tokenData) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">Loading token details...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Token Details</h2>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto">
        {/* Token basic info */}
        <div className="flex items-center mb-4">
          {tokenData.icon ? (
            <img src={tokenData.icon} alt={tokenData.symbol} className="w-12 h-12 rounded-full mr-3" />
          ) : (
            <div className="w-12 h-12 rounded-full mr-3 flex items-center justify-center text-xl font-semibold bg-gray-200 dark:bg-gray-700">
              {tokenData.symbol?.charAt(0) || '?'}
            </div>
          )}
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{tokenData.symbol}</h3>
            <p className="text-gray-500 dark:text-gray-400">{tokenData.name}</p>
          </div>
        </div>

        {/* Price and market info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400">Price</div>
            <div className="text-lg font-semibold">{formatPrice(tokenData.price?.value)}</div>
          </div>
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400">Market Cap</div>
            <div className="text-lg font-semibold">${formatNumber(tokenData.metrics?.marketCap)}</div>
          </div>
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400">24h Volume</div>
            <div className="text-lg font-semibold">${formatNumber(tokenData.metrics?.volume24h)}</div>
          </div>
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400">Liquidity</div>
            <div className="text-lg font-semibold">${formatNumber(tokenData.metrics?.liquidity)}</div>
          </div>
        </div>

        {/* Trading Signals */}
        <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-800/20 border border-blue-200 dark:border-indigo-800/50 rounded-lg">
          <h3 className="text-md font-semibold mb-2 text-gray-800 dark:text-white">Early Runner Potential</h3>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm">Overall Score</span>
              <span className={`text-sm font-semibold ${getSignalIndicator(tradingSignals.overall).color}`}>
                {getSignalIndicator(tradingSignals.overall).text}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div 
                className="h-2.5 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" 
                style={{ width: `${tradingSignals.overall}%` }}
              ></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">Momentum</span>
              <div className="flex items-center">
                <span className="text-xs mr-1">{tradingSignals.momentum}/100</span>
                <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${tradingSignals.momentum >= 70 ? 'bg-green-500' : tradingSignals.momentum >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${tradingSignals.momentum}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">Liquidity</span>
              <div className="flex items-center">
                <span className="text-xs mr-1">{tradingSignals.liquidity}/100</span>
                <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${tradingSignals.liquidity >= 70 ? 'bg-green-500' : tradingSignals.liquidity >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${tradingSignals.liquidity}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">Buy Pressure</span>
              <div className="flex items-center">
                <span className="text-xs mr-1">{tradingSignals.buyPressure}/100</span>
                <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${tradingSignals.buyPressure >= 70 ? 'bg-green-500' : tradingSignals.buyPressure >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${tradingSignals.buyPressure}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">Volatility</span>
              <div className="flex items-center">
                <span className="text-xs mr-1">{tradingSignals.volatility}/100</span>
                <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${tradingSignals.volatility >= 70 ? 'bg-green-500' : tradingSignals.volatility >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${tradingSignals.volatility}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trading summary */}
        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h3 className="text-md font-semibold mb-2 text-gray-800 dark:text-white">Trading Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Buy/Sell Ratio</span>
              <span className={tokenData.metrics?.buySellRatio > 1.5 ? 'text-green-500' : tokenData.metrics?.buySellRatio < 0.5 ? 'text-red-500' : ''}>
                {tokenData.metrics?.buySellRatio ? tokenData.metrics.buySellRatio.toFixed(2) : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">24h Transactions</span>
              <span>{tokenData.metrics?.totalTransactions24h || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Created</span>
              <span>{tokenData.details?.createdAt ? new Date(tokenData.details.createdAt).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Age (days)</span>
              <span>{tokenData.details?.ageDays || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Signal explanation */}
        <div className="text-xs text-gray-500 italic mt-2">
          <p>
            <AlertTriangle size={12} className="inline mr-1" />
            This is an experimental score system. Always conduct your own research before making investment decisions.
          </p>
        </div>
      </div>
    </div>
  );
}

// These are complex trading signal algorithms - in a real-world scenario these would analyze more data

// Calculate momentum based on price changes and transaction volume trends
function calculateMomentumScore(tokenData: any): number {
  if (!tokenData || !tokenData.metrics) return 50;
  
  // Basic factors that contribute to momentum
  const volume = tokenData.metrics.volume24h || 0;
  const liquidity = tokenData.metrics.liquidity || 1;
  const transactions = tokenData.metrics.totalTransactions24h || 0;
  
  // Volume to liquidity ratio - high volume relative to liquidity is a positive signal
  const volumeToLiquidityRatio = Math.min(volume / liquidity * 10, 4);
  
  // Transaction count factor - more transactions indicate more interest
  const transactionFactor = Math.min(transactions / 20, 3);
  
  // For new tokens (less than 30 days), give a boost to momentum
  const ageBoost = tokenData.details?.ageDays && tokenData.details.ageDays < 30 ? 10 : 0;
  
  // Combine all factors
  const score = 50 + (volumeToLiquidityRatio * 10) + (transactionFactor * 5) + ageBoost;
  
  // Ensure score is between 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Calculate liquidity score based on liquidity depth and stability
function calculateLiquidityScore(tokenData: any): number {
  if (!tokenData || !tokenData.metrics) return 50;
  
  const liquidity = tokenData.metrics.liquidity || 0;
  const marketCap = tokenData.metrics.marketCap || 1;
  
  // Base score depends on absolute liquidity value
  let baseScore = 0;
  if (liquidity >= 1000000) baseScore = 80; // >= $1M liquidity
  else if (liquidity >= 500000) baseScore = 70; // >= $500K liquidity
  else if (liquidity >= 100000) baseScore = 60; // >= $100K liquidity
  else if (liquidity >= 50000) baseScore = 50; // >= $50K liquidity
  else if (liquidity >= 10000) baseScore = 40; // >= $10K liquidity
  else baseScore = 30;
  
  // Liquidity to market cap ratio - higher is better (more efficient trading)
  const liquidityToMarketCapRatio = Math.min((liquidity / marketCap) * 100, 50);
  
  // Adjust score based on this ratio
  const adjustedScore = baseScore + (liquidityToMarketCapRatio / 2);
  
  // Ensure score is between 0-100
  return Math.max(0, Math.min(100, Math.round(adjustedScore)));
}

// Calculate buy pressure based on buy/sell ratio and recent transaction trends
function calculateBuyPressureScore(tokenData: any): number {
  if (!tokenData || !tokenData.metrics) return 50;
  
  const buySellRatio = tokenData.metrics.buySellRatio || 1;
  
  // Base score from buy/sell ratio
  let score = 50; // Neutral starting point
  
  if (buySellRatio >= 2) score = 80; // Strong buying pressure
  else if (buySellRatio >= 1.5) score = 70; // Good buying pressure
  else if (buySellRatio >= 1.2) score = 60; // Mild buying pressure
  else if (buySellRatio <= 0.5) score = 30; // Strong selling pressure
  else if (buySellRatio <= 0.8) score = 40; // Mild selling pressure
  
  // Adjust for transaction volume
  const volume = tokenData.metrics.volume24h || 0;
  const volumeAdjustment = volume > 100000 ? 10 : volume > 10000 ? 5 : 0;
  
  // Final score with adjustments
  const finalScore = score + volumeAdjustment;
  
  // Ensure score is between 0-100
  return Math.max(0, Math.min(100, Math.round(finalScore)));
}

// Calculate volatility score - higher volatility can indicate early runner potential
function calculateVolatilityScore(tokenData: any): number {
  // In a real implementation, we would analyze price movements over different time periods
  // For this demo we'll use a simplified approach
  
  if (!tokenData) return 50;
  
  // Age of token affects volatility score - newer tokens tend to be more volatile
  const ageDays = tokenData.details?.ageDays || 100;
  let ageVolatilityBonus = 0;
  
  if (ageDays < 7) ageVolatilityBonus = 30; // Very new tokens
  else if (ageDays < 30) ageVolatilityBonus = 20; // Recent tokens
  else if (ageDays < 90) ageVolatilityBonus = 10; // Established but still young
  
  // Market cap affects volatility - smaller cap = more volatile
  const marketCap = tokenData.metrics?.marketCap || 1000000;
  let marketCapVolatilityBonus = 0;
  
  if (marketCap < 100000) marketCapVolatilityBonus = 30; // Micro cap
  else if (marketCap < 1000000) marketCapVolatilityBonus = 20; // Very small cap
  else if (marketCap < 10000000) marketCapVolatilityBonus = 10; // Small cap
  
  // Base volatility score (50 is average volatility)
  const baseScore = 50;
  
  // Combine factors
  const finalScore = baseScore + ageVolatilityBonus + marketCapVolatilityBonus;
  
  // Ensure score is between 0-100
  return Math.max(0, Math.min(100, Math.round(finalScore)));
} 