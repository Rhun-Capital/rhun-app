import React from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Activity, Clock, Info } from 'lucide-react';
import { TechnicalAnalysisProps, IndicatorAnalysis } from '@/types/analysis';

const analyzeIndicator = (indicator: string, value: any, data: TechnicalAnalysisProps['data']): IndicatorAnalysis => {
  const currentPrice = data?.currentPrice || 0;
  const technicalIndicators = data?.technicalIndicators || {};
  
  switch (indicator) {
    case 'SMA':
      const sma20 = technicalIndicators?.sma?.['20'] || 0;
      const sma50 = technicalIndicators?.sma?.['50'] || 0;
      const sma200 = technicalIndicators?.sma?.['200'] || 0;
      
      if (currentPrice > sma20 && sma20 > sma50 && sma50 > sma200) {
        return {
          status: 'bullish',
          summary: 'Strong uptrend with price above all SMAs',
          details: [
            `Price (${currentPrice.toFixed(2)}) is above all SMAs`,
            `SMA 20 (${sma20.toFixed(2)}) is above SMA 50 (${sma50.toFixed(2)})`,
            `SMA 50 is above SMA 200 (${sma200.toFixed(2)})`
          ]
        };
      } else if (currentPrice < sma20 && sma20 < sma50 && sma50 < sma200) {
        return {
          status: 'bearish',
          summary: 'Strong downtrend with price below all SMAs',
          details: [
            `Price (${currentPrice.toFixed(2)}) is below all SMAs`,
            `SMA 20 (${sma20.toFixed(2)}) is below SMA 50 (${sma50.toFixed(2)})`,
            `SMA 50 is below SMA 200 (${sma200.toFixed(2)})`
          ]
        };
      }
      return {
        status: 'neutral',
        summary: 'Mixed trend signals from SMAs',
        details: [
          `Price (${currentPrice.toFixed(2)}) is between SMAs`,
          `SMA 20: ${sma20.toFixed(2)}`,
          `SMA 50: ${sma50.toFixed(2)}`,
          `SMA 200: ${sma200.toFixed(2)}`
        ]
      };

    case 'RSI':
      const rsi = technicalIndicators?.rsi || 0;
      if (rsi > 70) {
        return {
          status: 'bearish',
          summary: 'Overbought conditions',
          details: [
            `RSI (${rsi.toFixed(2)}) is above 70`,
            'Potential reversal point'
          ]
        };
      } else if (rsi < 30) {
        return {
          status: 'bullish',
          summary: 'Oversold conditions',
          details: [
            `RSI (${rsi.toFixed(2)}) is below 30`,
            'Potential reversal point'
          ]
        };
      }
      return {
        status: 'neutral',
        summary: 'Neutral RSI conditions',
        details: [
          `RSI (${rsi.toFixed(2)}) is between 30 and 70`,
          'No extreme conditions'
        ]
      };

    case 'MACD':
      const macd = technicalIndicators?.macd || { macd: 0, signal: 0, histogram: 0 };
      if (macd.macd > macd.signal) {
        return {
          status: 'bullish',
          summary: 'MACD above signal line',
          details: [
            `MACD (${macd.macd.toFixed(2)}) is above Signal (${macd.signal.toFixed(2)})`,
            `Histogram: ${macd.histogram.toFixed(2)}`
          ]
        };
      } else if (macd.macd < macd.signal) {
        return {
          status: 'bearish',
          summary: 'MACD below signal line',
          details: [
            `MACD (${macd.macd.toFixed(2)}) is below Signal (${macd.signal.toFixed(2)})`,
            `Histogram: ${macd.histogram.toFixed(2)}`
          ]
        };
      }
      return {
        status: 'neutral',
        summary: 'MACD crossing signal line',
        details: [
          `MACD (${macd.macd.toFixed(2)}) is near Signal (${macd.signal.toFixed(2)})`,
          `Histogram: ${macd.histogram.toFixed(2)}`
        ]
      };

    case 'Bollinger Bands':
      const bb = technicalIndicators?.bollingerBands || { upper: 0, middle: 0, lower: 0 };
      if (currentPrice > bb.upper) {
        return {
          status: 'bearish',
          summary: 'Price above upper band',
          details: [
            `Price (${currentPrice.toFixed(2)}) is above upper band (${bb.upper.toFixed(2)})`,
            'Potential overbought condition'
          ]
        };
      } else if (currentPrice < bb.lower) {
        return {
          status: 'bullish',
          summary: 'Price below lower band',
          details: [
            `Price (${currentPrice.toFixed(2)}) is below lower band (${bb.lower.toFixed(2)})`,
            'Potential oversold condition'
          ]
        };
      }
      return {
        status: 'neutral',
        summary: 'Price within bands',
        details: [
          `Price (${currentPrice.toFixed(2)}) is between bands`,
          `Upper: ${bb.upper.toFixed(2)}, Lower: ${bb.lower.toFixed(2)}`
        ]
      };

    case 'Ichimoku':
      const ichimoku = technicalIndicators?.ichimoku || { tenkan: 0, kijun: 0, senkouA: 0, senkouB: 0 };
      if (currentPrice > ichimoku.tenkan && ichimoku.tenkan > ichimoku.kijun) {
        return {
          status: 'bullish',
          summary: 'Strong uptrend',
          details: [
            `Price (${currentPrice.toFixed(2)}) is above Tenkan (${ichimoku.tenkan.toFixed(2)})`,
            `Tenkan is above Kijun (${ichimoku.kijun.toFixed(2)})`
          ]
        };
      } else if (currentPrice < ichimoku.tenkan && ichimoku.tenkan < ichimoku.kijun) {
        return {
          status: 'bearish',
          summary: 'Strong downtrend',
          details: [
            `Price (${currentPrice.toFixed(2)}) is below Tenkan (${ichimoku.tenkan.toFixed(2)})`,
            `Tenkan is below Kijun (${ichimoku.kijun.toFixed(2)})`
          ]
        };
      }
      return {
        status: 'neutral',
        summary: 'Mixed signals',
        details: [
          `Price (${currentPrice.toFixed(2)}) is between Tenkan and Kijun`,
          `Tenkan: ${ichimoku.tenkan.toFixed(2)}, Kijun: ${ichimoku.kijun.toFixed(2)}`
        ]
      };

    case 'Pivot Points':
      const pivotPoints = technicalIndicators?.pivotPoints || { pivot: 0, r1: 0, r2: 0, s1: 0, s2: 0 };
      if (currentPrice > pivotPoints.pivot) {
        return {
          status: 'bullish',
          summary: 'Price above pivot',
          details: [
            `Price (${currentPrice.toFixed(2)}) is above pivot (${pivotPoints.pivot.toFixed(2)})`,
            `Next resistance: ${pivotPoints.r1.toFixed(2)}`
          ]
        };
      } else if (currentPrice < pivotPoints.pivot) {
        return {
          status: 'bearish',
          summary: 'Price below pivot',
          details: [
            `Price (${currentPrice.toFixed(2)}) is below pivot (${pivotPoints.pivot.toFixed(2)})`,
            `Next support: ${pivotPoints.s1.toFixed(2)}`
          ]
        };
      }
      return {
        status: 'neutral',
        summary: 'Price at pivot',
        details: [
          `Price (${currentPrice.toFixed(2)}) is near pivot (${pivotPoints.pivot.toFixed(2)})`,
          'Potential reversal point'
        ]
      };

    case 'Fibonacci':
      const fib = technicalIndicators?.fibonacciRetracement || { level0: 0, level236: 0, level382: 0, level500: 0, level618: 0, level100: 0 };
      if (currentPrice > fib.level618) {
        return {
          status: 'bearish',
          summary: 'Price above 61.8% retracement',
          details: [
            `Price (${currentPrice.toFixed(2)}) is above 61.8% level (${fib.level618.toFixed(2)})`,
            'Potential reversal point'
          ]
        };
      } else if (currentPrice < fib.level382) {
        return {
          status: 'bullish',
          summary: 'Price below 38.2% retracement',
          details: [
            `Price (${currentPrice.toFixed(2)}) is below 38.2% level (${fib.level382.toFixed(2)})`,
            'Potential reversal point'
          ]
        };
      }
      return {
        status: 'neutral',
        summary: 'Price within Fibonacci levels',
        details: [
          `Price (${currentPrice.toFixed(2)}) is between 38.2% and 61.8% levels`,
          `38.2%: ${fib.level382.toFixed(2)}, 61.8%: ${fib.level618.toFixed(2)}`
        ]
      };

    case 'Volume':
      const volume = technicalIndicators?.volume || { volume: 0, volumeSMA: 0, volumeEMA: 0 };
      const volumeValue = volume?.volume || 0;
      const volumeSMAValue = volume?.volumeSMA || 0;
      
      if (volumeValue > volumeSMAValue) {
        return {
          status: 'bullish',
          summary: 'High volume above average',
          details: [
            `Current volume (${volumeValue.toFixed(2)}) is above SMA (${volumeSMAValue.toFixed(2)})`,
            'Strong buying pressure'
          ]
        };
      } else if (volumeValue < volumeSMAValue) {
        return {
          status: 'bearish',
          summary: 'Low volume below average',
          details: [
            `Current volume (${volumeValue.toFixed(2)}) is below SMA (${volumeSMAValue.toFixed(2)})`,
            'Weak buying pressure'
          ]
        };
      }
      return {
        status: 'neutral',
        summary: 'Average volume',
        details: [
          `Current volume (${volumeValue.toFixed(2)}) is near SMA (${volumeSMAValue.toFixed(2)})`,
          'Normal trading activity'
        ]
      };

    case 'ADX':
      const adx = technicalIndicators?.adx || 0;
      const dmi = technicalIndicators?.dmi || { plus: 0, minus: 0 };
      
      if (adx > 25) {
        if (dmi.plus > dmi.minus) {
          return {
            status: 'bullish',
            summary: 'Strong upward trend',
            details: [
              `ADX (${adx.toFixed(2)}) indicates strong trend`,
              `+DI (${dmi.plus.toFixed(2)}) > -DI (${dmi.minus.toFixed(2)})`,
              'Bullish momentum confirmed'
            ]
          };
        } else {
          return {
            status: 'bearish',
            summary: 'Strong downward trend',
            details: [
              `ADX (${adx.toFixed(2)}) indicates strong trend`,
              `+DI (${dmi.plus.toFixed(2)}) < -DI (${dmi.minus.toFixed(2)})`,
              'Bearish momentum confirmed'
            ]
          };
        }
      }
      return {
        status: 'neutral',
        summary: 'Weak or no trend',
        details: [
          `ADX (${adx.toFixed(2)}) indicates weak trend strength`,
          `+DI: ${dmi.plus.toFixed(2)}, -DI: ${dmi.minus.toFixed(2)}`,
          'Wait for stronger trend development'
        ]
      };

    case 'DMI':
      const dmiData = technicalIndicators?.dmi || { plus: 0, minus: 0 };
      const dmiDiff = dmiData.plus - dmiData.minus;
      
      if (Math.abs(dmiDiff) > 20) {
        if (dmiData.plus > dmiData.minus) {
          return {
            status: 'bullish',
            summary: 'Strong positive directional movement',
            details: [
              `+DI (${dmiData.plus.toFixed(2)}) significantly above -DI (${dmiData.minus.toFixed(2)})`,
              'Strong bullish trend indication'
            ]
          };
        } else {
          return {
            status: 'bearish',
            summary: 'Strong negative directional movement',
            details: [
              `-DI (${dmiData.minus.toFixed(2)}) significantly above +DI (${dmiData.plus.toFixed(2)})`,
              'Strong bearish trend indication'
            ]
          };
        }
      }
      return {
        status: 'neutral',
        summary: 'No clear directional movement',
        details: [
          `+DI: ${dmiData.plus.toFixed(2)}, -DI: ${dmiData.minus.toFixed(2)}`,
          'Trend direction not clearly established'
        ]
      };

    case 'Aroon':
      const aroon = technicalIndicators?.aroon || { up: 0, down: 0 };
      
      if (aroon.up > 70 && aroon.up > aroon.down) {
        return {
          status: 'bullish',
          summary: 'Strong upward trend potential',
          details: [
            `Aroon Up (${aroon.up.toFixed(2)}) > Aroon Down (${aroon.down.toFixed(2)})`,
            'Recent highs indicate bullish momentum'
          ]
        };
      } else if (aroon.down > 70 && aroon.down > aroon.up) {
        return {
          status: 'bearish',
          summary: 'Strong downward trend potential',
          details: [
            `Aroon Down (${aroon.down.toFixed(2)}) > Aroon Up (${aroon.up.toFixed(2)})`,
            'Recent lows indicate bearish momentum'
          ]
        };
      }
      return {
        status: 'neutral',
        summary: 'No clear trend direction',
        details: [
          `Aroon Up: ${aroon.up.toFixed(2)}, Down: ${aroon.down.toFixed(2)}`,
          'Consolidation or trend transition phase'
        ]
      };

    default:
      return {
        status: 'neutral',
        summary: 'No analysis available',
        details: ['Indicator not implemented']
      };
  }
};

const getStatusColor = (status: 'bullish' | 'bearish' | 'neutral'): string => {
  switch (status) {
    case 'bullish':
      return 'text-green-500';
    case 'bearish':
      return 'text-red-500';
    case 'neutral':
      return 'text-yellow-500';
    default:
      return 'text-zinc-400';
  }
};

const TechnicalAnalysis: React.FC<TechnicalAnalysisProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="p-6 bg-zinc-800 rounded-lg">
        <div className="text-center text-zinc-400">No data available</div>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    if (!num && num !== 0) return '0.00';
    
    // For very small numbers (< 0.01), use more decimal places
    if (Math.abs(num) < 0.01 && num !== 0) {
      // Count leading zeros after decimal point
      const numStr = num.toString();
      const decimalPart = numStr.split('.')[1] || '';
      let leadingZeros = 0;
      
      for (let i = 0; i < decimalPart.length; i++) {
        if (decimalPart[i] === '0') {
          leadingZeros++;
        } else {
          break;
        }
      }
      
      // Use at least 6 significant digits for very small numbers to preserve precision
      // This will ensure numbers like 0.000295 are shown properly
      const significantDigits = Math.max(6, leadingZeros + 3);
      return num.toFixed(significantDigits);
    }
    
    // For normal numbers, use 2 decimal places
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatPercentage = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '0%';
    // The API already returns percentage values, so no need to multiply by 100
    return `${num.toFixed(1)}%`;
  };

  const getTrendColor = (trend: string) => {
    switch (trend.toLowerCase()) {
      case 'bullish':
        return 'text-green-400';
      case 'bearish':
        return 'text-red-400';
      default:
        return 'text-zinc-400';
    }
  };

  const technicalIndicators = data?.technicalIndicators || {};
  const sma = technicalIndicators?.sma || { '20': 0, '50': 0, '200': 0 };
  const ema = technicalIndicators?.ema || { '9': 0, '21': 0, '50': 0 };
  const priceChange = data.priceChange || { '24h': 0, '7d': 0, '30d': 0 };
  const supportResistance = data.supportResistance || { support: [], resistance: [] };
  const marketSentiment = data.marketSentiment || { trend: 'neutral', strength: 0, confidence: 0 };
  const analysisPeriod = data.analysisPeriod || { days: 0 };
  const lastUpdated = data.lastUpdated || new Date().toISOString();

  const volume = technicalIndicators?.volume || { volume: 0, volumeSMA: 0, volumeEMA: 0 };
  const macd = technicalIndicators?.macd || { macd: 0, signal: 0, histogram: 0 };
  const dmi = technicalIndicators?.dmi || { plus: 0, minus: 0 };
  const aroon = technicalIndicators?.aroon || { up: 0, down: 0 };
  const bollingerBands = technicalIndicators?.bollingerBands || { upper: 0, middle: 0, lower: 0 };
  const pivotPoints = technicalIndicators?.pivotPoints || { pivot: 0, r1: 0, r2: 0, s1: 0, s2: 0 };
  const fibonacciRetracement = technicalIndicators?.fibonacciRetracement || { level0: 0, level236: 0, level382: 0, level500: 0, level618: 0, level100: 0 };
  const ichimoku = technicalIndicators?.ichimoku || { tenkan: 0, kijun: 0, senkouA: 0, senkouB: 0 };

  return (
    <div className="p-6 bg-zinc-800 rounded-lg">
      {/* Price Section */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          {data.image && (
            <img 
              src={data.image} 
              alt={`${data.symbol || 'Unknown'} icon`}
              className="w-12 h-12 rounded-full"
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold text-white">
                {(data.symbol || 'Unknown').toUpperCase()}
              </h3>
              {data.name && (
                <span className="text-lg text-zinc-400">
                  ({data.name})
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-3xl text-white font-bold flex items-center gap-2 mt-2">
          $
          {formatNumber(data.currentPrice)}
        </div>
        <div className="flex gap-4 mt-2">
          <div className="flex items-center gap-1">
            <span className="text-sm text-zinc-400">24h:</span>
            <span className={`text-sm ${(priceChange['24h'] || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPercentage(priceChange['24h'])}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-zinc-400">7d:</span>
            <span className={`text-sm ${(priceChange['7d'] || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPercentage(priceChange['7d'])}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-zinc-400">30d:</span>
            <span className={`text-sm ${(priceChange['30d'] || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPercentage(priceChange['30d'])}
            </span>
          </div>
        </div>
      </div>

      {/* Market Summary */}
      <div className="mb-6">
        <h3 className="text-lg text-white font-semibold mb-4">
          Market Summary
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Key Price Levels */}
          <div className="bg-zinc-900 p-3 rounded">
            <div className="text-sm text-zinc-400 mb-2">Key Price Levels</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Current Price</span>
                <span className="text-sm text-zinc-300">${formatNumber(data.currentPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">24h High</span>
                <span className="text-sm text-zinc-300">${formatNumber(data.currentPrice * (1 + Math.abs(priceChange['24h'] / 100)))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">24h Low</span>
                <span className="text-sm text-zinc-300">${formatNumber(data.currentPrice * (1 - Math.abs(priceChange['24h'] / 100)))}</span>
              </div>
            </div>
          </div>

          {/* Key Levels */}
          <div className="bg-zinc-900 p-3 rounded">
            <div className="text-sm text-zinc-400 mb-2">Key Levels</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Nearest Support</span>
                <span className="text-sm text-zinc-300">${formatNumber(supportResistance.support[0])}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Nearest Resistance</span>
                <span className="text-sm text-zinc-300">${formatNumber(supportResistance.resistance[0])}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Pivot Point</span>
                <span className="text-sm text-zinc-300">${formatNumber(pivotPoints.pivot)}</span>
              </div>
            </div>
          </div>

          {/* Market Metrics */}
          <div className="bg-zinc-900 p-3 rounded">
            <div className="text-sm text-zinc-400 mb-2">Market Metrics</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Volatility (ATR)</span>
                <span className="text-sm text-zinc-300">{formatNumber(technicalIndicators.atr)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Volume 24h</span>
                <span className="text-sm text-zinc-300">{formatNumber(volume.volume)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Trend Strength (ADX)</span>
                <span className="text-sm text-zinc-300">{formatNumber(technicalIndicators.adx)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Analysis */}
      <div className="mb-6">
        <h3 className="text-lg text-white font-semibold mb-4">
          Quick Analysis
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className={`p-3 rounded ${analyzeIndicator('RSI', null, data).status === 'bullish' ? 'bg-green-500/10' : analyzeIndicator('RSI', null, data).status === 'bearish' ? 'bg-red-500/10' : 'bg-yellow-500/10'}`}>
            <div className="text-sm text-zinc-400">RSI</div>
            <div className={`text-sm ${analyzeIndicator('RSI', null, data).status === 'bullish' ? 'text-green-400' : analyzeIndicator('RSI', null, data).status === 'bearish' ? 'text-red-400' : 'text-yellow-400'}`}>
              {analyzeIndicator('RSI', null, data).summary}
            </div>
          </div>

          <div className={`p-3 rounded ${analyzeIndicator('MACD', null, data).status === 'bullish' ? 'bg-green-500/10' : analyzeIndicator('MACD', null, data).status === 'bearish' ? 'bg-red-500/10' : 'bg-yellow-500/10'}`}>
            <div className="text-sm text-zinc-400">MACD</div>
            <div className={`text-sm ${analyzeIndicator('MACD', null, data).status === 'bullish' ? 'text-green-400' : analyzeIndicator('MACD', null, data).status === 'bearish' ? 'text-red-400' : 'text-yellow-400'}`}>
              {analyzeIndicator('MACD', null, data).summary}
            </div>
          </div>

          <div className={`p-3 rounded ${analyzeIndicator('Bollinger Bands', null, data).status === 'bullish' ? 'bg-green-500/10' : analyzeIndicator('Bollinger Bands', null, data).status === 'bearish' ? 'bg-red-500/10' : 'bg-yellow-500/10'}`}>
            <div className="text-sm text-zinc-400">Bollinger Bands</div>
            <div className={`text-sm ${analyzeIndicator('Bollinger Bands', null, data).status === 'bullish' ? 'text-green-400' : analyzeIndicator('Bollinger Bands', null, data).status === 'bearish' ? 'text-red-400' : 'text-yellow-400'}`}>
              {analyzeIndicator('Bollinger Bands', null, data).summary}
            </div>
          </div>

          <div className={`p-3 rounded ${analyzeIndicator('Volume', null, data).status === 'bullish' ? 'bg-green-500/10' : analyzeIndicator('Volume', null, data).status === 'bearish' ? 'bg-red-500/10' : 'bg-yellow-500/10'}`}>
            <div className="text-sm text-zinc-400">Volume</div>
            <div className={`text-sm ${analyzeIndicator('Volume', null, data).status === 'bullish' ? 'text-green-400' : analyzeIndicator('Volume', null, data).status === 'bearish' ? 'text-red-400' : 'text-yellow-400'}`}>
              {analyzeIndicator('Volume', null, data).summary}
            </div>
          </div>
        </div>
      </div>

      {/* Technical Indicators */}
      <div className="mb-6">
        <h3 className="text-lg text-white font-semibold mb-4">
          Technical Indicators
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Moving Averages */}
          <div className="bg-zinc-900 p-4 rounded-lg text-white">
            <div className="text-sm text-zinc-400 mb-2">Moving Averages</div>
            <div className="space-y-2">
              {sma['20'] !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">SMA 20</span>
                  <span className="font-medium text-white">{formatNumber(sma['20'])}</span>
                </div>
              )}
              {sma['50'] !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">SMA 50</span>
                  <span className="font-medium text-white">{formatNumber(sma['50'])}</span>
                </div>
              )}
              {sma['200'] !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">SMA 200</span>
                  <span className="font-medium text-white">{formatNumber(sma['200'])}</span>
                </div>
              )}
              {ema['9'] !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">EMA 9</span>
                  <span className="font-medium text-white">{formatNumber(ema['9'])}</span>
                </div>
              )}
              {ema['21'] !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">EMA 21</span>
                  <span className="font-medium text-white">{formatNumber(ema['21'])}</span>
                </div>
              )}
              {ema['50'] !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">EMA 50</span>
                  <span className="font-medium text-white">{formatNumber(ema['50'])}</span>
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-zinc-800">
                {(() => {
                  const analysis = analyzeIndicator('SMA', null, data);
                  return (
                    <div>
                      <div className={`text-sm font-medium ${getStatusColor(analysis.status)} mb-1`}>
                        {analysis.summary}
                      </div>
                      <div className="text-xs text-zinc-400 space-y-1">
                        {analysis.details.map((detail, index) => (
                          <div key={index}>{detail}</div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Momentum Indicators */}
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-400 mb-2">Momentum Indicators</div>
            <div className="space-y-2">
              {technicalIndicators.rsi !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">RSI</span>
                  <span className="font-medium text-white">{formatNumber(technicalIndicators.rsi)}</span>
                </div>
              )}
              {technicalIndicators.stochRSI !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">StochRSI</span>
                  <span className="font-medium text-white">{formatNumber(technicalIndicators.stochRSI)}</span>
                </div>
              )}
              {technicalIndicators.cci !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">CCI</span>
                  <span className="font-medium text-white">{formatNumber(technicalIndicators.cci)}</span>
                </div>
              )}
              {technicalIndicators.mfi !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">MFI</span>
                  <span className="font-medium text-white">{formatNumber(technicalIndicators.mfi)}</span>
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-zinc-800">
                {(() => {
                  const analysis = analyzeIndicator('RSI', null, data);
                  return (
                    <div>
                      <div className={`text-sm font-medium ${getStatusColor(analysis.status)} mb-1`}>
                        {analysis.summary}
                      </div>
                      <div className="text-xs text-zinc-400 space-y-1">
                        {analysis.details.map((detail, index) => (
                          <div key={index}>{detail}</div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Trend Indicators */}
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-400 mb-2">Trend Indicators</div>
            <div className="space-y-2">
              {technicalIndicators.adx !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">ADX</span>
                  <span className="font-medium text-white">{formatNumber(technicalIndicators.adx)}</span>
                </div>
              )}
              {dmi.plus !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">+DI</span>
                  <span className="font-medium text-white">{formatNumber(dmi.plus)}</span>
                </div>
              )}
              {dmi.minus !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">-DI</span>
                  <span className="font-medium text-white">{formatNumber(dmi.minus)}</span>
                </div>
              )}
              {aroon.up !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">Aroon Up</span>
                  <span className="font-medium text-white">{formatNumber(aroon.up)}</span>
                </div>
              )}
              {aroon.down !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">Aroon Down</span>
                  <span className="font-medium text-white">{formatNumber(aroon.down)}</span>
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-zinc-800">
                {(() => {
                  const analysis = analyzeIndicator('ADX', null, data);
                  return (
                    <div>
                      <div className={`text-sm font-medium ${getStatusColor(analysis.status)} mb-1`}>
                        {analysis.summary}
                      </div>
                      <div className="text-xs text-zinc-400 space-y-1">
                        {analysis.details.map((detail, index) => (
                          <div key={index}>{detail}</div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* MACD */}
          <div className="bg-zinc-900 p-4 rounded-lg text-white">
            <div className="text-sm text-zinc-400 mb-2">MACD</div>
            <div className="space-y-2">
              {macd.macd !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">MACD Line</span>
                  <span className="font-medium text-white">{formatNumber(macd.macd)}</span>
                </div>
              )}
              {macd.signal !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">Signal Line</span>
                  <span className="font-medium text-white">{formatNumber(macd.signal)}</span>
                </div>
              )}
              {macd.histogram !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">Histogram</span>
                  <span className="font-medium text-white">{formatNumber(macd.histogram)}</span>
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-zinc-800">
                {(() => {
                  const analysis = analyzeIndicator('MACD', null, data);
                  return (
                    <div>
                      <div className={`text-sm font-medium ${getStatusColor(analysis.status)} mb-1`}>
                        {analysis.summary}
                      </div>
                      <div className="text-xs text-zinc-400 space-y-1">
                        {analysis.details.map((detail, index) => (
                          <div key={index}>{detail}</div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Ichimoku Cloud */}
          <div className="bg-zinc-900 p-4 rounded-lg text-white">
            <div className="text-sm text-zinc-400 mb-2">Ichimoku Cloud</div>
            <div className="space-y-2">
              {ichimoku.tenkan !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">Tenkan</span>
                  <span className="font-medium text-white">{formatNumber(ichimoku.tenkan)}</span>
                </div>
              )}
              {ichimoku.kijun !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">Kijun</span>
                  <span className="font-medium text-white">{formatNumber(ichimoku.kijun)}</span>
                </div>
              )}
              {ichimoku.senkouA !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">Senkou A</span>
                  <span className="font-medium text-white">{formatNumber(ichimoku.senkouA)}</span>
                </div>
              )}
              {ichimoku.senkouB !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">Senkou B</span>
                  <span className="font-medium text-white">{formatNumber(ichimoku.senkouB)}</span>
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-zinc-800">
                {(() => {
                  const analysis = analyzeIndicator('Ichimoku', null, data);
                  return (
                    <div>
                      <div className={`text-sm font-medium ${getStatusColor(analysis.status)} mb-1`}>
                        {analysis.summary}
                      </div>
                      <div className="text-xs text-zinc-400 space-y-1">
                        {analysis.details.map((detail, index) => (
                          <div key={index}>{detail}</div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Volume Indicators */}
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-400 mb-2">Volume Indicators</div>
            <div className="space-y-2">
              {volume.volume !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">Volume</span>
                  <span className="font-medium text-white">{formatNumber(volume.volume)}</span>
                </div>
              )}
              {volume.volumeSMA !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">Volume SMA</span>
                  <span className="font-medium text-white">{formatNumber(volume.volumeSMA)}</span>
                </div>
              )}
              {volume.volumeEMA !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">Volume EMA</span>
                  <span className="font-medium text-white">{formatNumber(volume.volumeEMA)}</span>
                </div>
              )}
              {technicalIndicators.obv !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">OBV</span>
                  <span className="font-medium text-white">{formatNumber(technicalIndicators.obv)}</span>
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-zinc-800">
                {(() => {
                  const analysis = analyzeIndicator('Volume', null, data);
                  return (
                    <div>
                      <div className={`text-sm font-medium ${getStatusColor(analysis.status)} mb-1`}>
                        {analysis.summary}
                      </div>
                      <div className="text-xs text-zinc-400 space-y-1">
                        {analysis.details.map((detail, index) => (
                          <div key={index}>{detail}</div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Bollinger Bands */}
          <div className="bg-zinc-900 p-4 rounded-lg text-white">
            <div className="text-sm text-zinc-400 mb-2">Bollinger Bands</div>
            <div className="space-y-2">
              {bollingerBands.upper !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">Upper Band</span>
                  <span className="font-medium text-white">{formatNumber(bollingerBands.upper)}</span>
                </div>
              )}
              {bollingerBands.middle !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">Middle Band</span>
                  <span className="font-medium text-white">{formatNumber(bollingerBands.middle)}</span>
                </div>
              )}
              {bollingerBands.lower !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">Lower Band</span>
                  <span className="font-medium text-white">{formatNumber(bollingerBands.lower)}</span>
                </div>
              )}
              {technicalIndicators.atr !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-400">ATR</span>
                  <span className="font-medium text-white">{formatNumber(technicalIndicators.atr)}</span>
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-zinc-800">
                {(() => {
                  const analysis = analyzeIndicator('Bollinger Bands', null, data);
                  return (
                    <div>
                      <div className={`text-sm font-medium ${getStatusColor(analysis.status)} mb-1`}>
                        {analysis.summary}
                      </div>
                      <div className="text-xs text-zinc-400 space-y-1">
                        {analysis.details.map((detail, index) => (
                          <div key={index}>{detail}</div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Pivot Points */}
          <div className="bg-zinc-900 p-4 rounded-lg text-white">
            <div className="text-sm text-zinc-400 mb-2">Pivot Points</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Pivot</span>
                <span className="font-medium text-white">{formatNumber(pivotPoints.pivot)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">R1</span>
                <span className="font-medium text-white">{formatNumber(pivotPoints.r1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">R2</span>
                <span className="font-medium text-white">{formatNumber(pivotPoints.r2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">S1</span>
                <span className="font-medium text-white">{formatNumber(pivotPoints.s1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">S2</span>
                <span className="font-medium text-white">{formatNumber(pivotPoints.s2)}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-800">
                {(() => {
                  const analysis = analyzeIndicator('Pivot Points', null, data);
                  return (
                    <div>
                      <div className={`text-sm font-medium ${getStatusColor(analysis.status)} mb-1`}>
                        {analysis.summary}
                      </div>
                      <div className="text-xs text-zinc-400 space-y-1">
                        {analysis.details.map((detail, index) => (
                          <div key={index}>{detail}</div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Fibonacci Retracement */}
          <div className="bg-zinc-900 p-4 rounded-lg text-white">
            <div className="text-sm text-zinc-400 mb-2">Fibonacci Retracement</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Level 0%</span>
                <span className="font-medium text-white">{formatNumber(fibonacciRetracement.level0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Level 23.6%</span>
                <span className="font-medium text-white">{formatNumber(fibonacciRetracement.level236)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Level 38.2%</span>
                <span className="font-medium text-white">{formatNumber(fibonacciRetracement.level382)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Level 50%</span>
                <span className="font-medium text-white">{formatNumber(fibonacciRetracement.level500)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Level 61.8%</span>
                <span className="font-medium text-white">{formatNumber(fibonacciRetracement.level618)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Level 100%</span>
                <span className="font-medium text-white">{formatNumber(fibonacciRetracement.level100)}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-800">
                {(() => {
                  const analysis = analyzeIndicator('Fibonacci', null, data);
                  return (
                    <div>
                      <div className={`text-sm font-medium ${getStatusColor(analysis.status)} mb-1`}>
                        {analysis.summary}
                      </div>
                      <div className="text-xs text-zinc-400 space-y-1">
                        {analysis.details.map((detail, index) => (
                          <div key={index}>{detail}</div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Support & Resistance */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">
          Support & Resistance
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-400 mb-2 text-white">Support Levels</div>
            <div className="space-y-2">
              {supportResistance.support.map((level, index) => (
                level !== 0 && (
                  <div key={index} className="flex justify-between">
                    <span className="text-sm text-zinc-400">Level {index + 1}</span>
                    <span className="font-medium text-white">{formatNumber(level)}</span>
                  </div>
                )
              ))}
            </div>
          </div>
          <div className="bg-zinc-900 p-4 rounded-lg text-white">
            <div className="text-sm text-zinc-400 mb-2">Resistance Levels</div>
            <div className="space-y-2">
              {supportResistance.resistance.map((level, index) => (
                level !== 0 && (
                  <div key={index} className="flex justify-between text-white">
                    <span className="text-sm text-white">Level {index + 1}</span>
                    <span className="font-medium text-white">{formatNumber(level)}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Market Sentiment */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 text-white">
          Market Sentiment
        </h3>
        <div className="bg-zinc-900 p-4 rounded-lg">
          <div className="text-sm text-zinc-400 mb-2 flex items-center gap-2">
            Market Sentiment
            <div className="group relative">
              <Info className="h-4 w-4 text-zinc-500 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-64 bg-zinc-800 text-xs text-zinc-300 p-3 rounded-lg shadow-lg z-10">
                <div className="font-medium mb-2">Confidence Calculation</div>
                <div className="space-y-1">
                  <div>• Base confidence starts at 50%</div>
                  <div>• RSI adjustments:</div>
                  <div className="ml-2">- RSI {'>'} 70: +20% (overbought)</div>
                  <div className="ml-2">- RSI {'<'} 30: -20% (oversold)</div>
                  <div>• Bollinger Bands adjustments:</div>
                  <div className="ml-2">- Price {'>'} upper band: +15%</div>
                  <div className="ml-2">- Price {'<'} lower band: -15%</div>
                  <div className="mt-2 text-zinc-400">
                    Higher confidence indicates stronger trend confirmation across multiple indicators.
                  </div>
                </div>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-zinc-800"></div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center gap-2 text-white">
                Trend
                <div className="group relative">
                  <Info className="h-3 w-3 text-zinc-500 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-64 bg-zinc-800 text-xs text-zinc-300 p-3 rounded-lg shadow-lg z-10">
                    <div className="font-medium mb-2">Trend Determination</div>
                    <div className="space-y-1">
                      <div>• Based on price position relative to SMAs</div>
                      <div>• Bullish: Price {'>'} SMA20 {'>'} SMA50</div>
                      <div>• Bearish: Price {'<'} SMA20 {'<'} SMA50</div>
                      <div>• Neutral: Mixed signals</div>
                      <div className="mt-2 text-zinc-400">
                        Trend indicates the overall market direction based on moving averages.
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-zinc-800"></div>
                  </div>
                </div>
              </span>
              <span className={`font-medium ${getStatusColor(marketSentiment.trend as 'bullish' | 'bearish' | 'neutral')}`}>
                {marketSentiment.trend.charAt(0).toUpperCase() + marketSentiment.trend.slice(1)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center gap-2 text-white">
                Strength
                <div className="group relative">
                  <Info className="h-3 w-3 text-zinc-500 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-64 bg-zinc-800 text-xs text-zinc-300 p-3 rounded-lg shadow-lg z-10">
                    <div className="font-medium mb-2">Strength Calculation</div>
                    <div className="space-y-1">
                      <div>• Based on price movement relative to SMAs</div>
                      <div>• Strong trend: {'>'} 70%</div>
                      <div>• Moderate trend: 30-70%</div>
                      <div>• Weak trend: {'<'} 30%</div>
                      <div className="mt-2 text-zinc-400">
                        Higher strength indicates stronger price movement in the trend direction.
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-zinc-800"></div>
                  </div>
                </div>
              </span>
              <span className={`font-medium ${getStatusColor(marketSentiment.trend as 'bullish' | 'bearish' | 'neutral')}`}>
                {formatPercentage(marketSentiment.strength)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm flex items-center gap-2 text-white">
                Confidence
                <div className="group relative">
                  <Info className="h-3 w-3 text-zinc-500 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-64 bg-zinc-800 text-xs text-zinc-300 p-3 rounded-lg shadow-lg z-10">
                    <div className="font-medium mb-2">Confidence Calculation</div>
                    <div className="space-y-1">
                      <div>• High confidence: {'>'} 70%</div>
                      <div>• Moderate confidence: 30-70%</div>
                      <div>• Low confidence: {'<'} 30%</div>
                      <div>• Based on multiple indicator confirmations</div>
                      <div className="mt-2 text-zinc-400">
                        Higher confidence indicates stronger agreement among technical indicators.
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-zinc-800"></div>
                  </div>
                </div>
              </span>
              <span className={`font-medium ${getStatusColor(marketSentiment.trend as 'bullish' | 'bearish' | 'neutral')}`}>
                {formatPercentage(marketSentiment.confidence)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Period */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-zinc-400 gap-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Analysis Period: {analysisPeriod.days} days</span>
        </div>
        <div>Last Updated: {new Date(lastUpdated).toLocaleString()}</div>
      </div>
    </div>
  );
};

export default TechnicalAnalysis; 