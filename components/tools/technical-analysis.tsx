import React from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Activity, Clock, Info } from 'lucide-react';

interface TechnicalAnalysisProps {
  data: {
    symbol: string;
    name?: string;
    currentPrice: number;
    image?: string;
    priceChange: {
      '24h': number;
      '7d': number;
      '30d': number;
    };
    technicalIndicators: {
      sma: {
        '20': number;
        '50': number;
        '200': number;
      };
      ema: {
        '9': number;
        '21': number;
        '50': number;
      };
      rsi: number;
      macd: {
        macd: number;
        signal: number;
        histogram: number;
      };
      stochRSI: number;
      cci: number;
      mfi: number;
      adx: number;
      dmi: {
        plus: number;
        minus: number;
      };
      ichimoku: {
        tenkan: number;
        kijun: number;
        senkouA: number;
        senkouB: number;
      };
      aroon: {
        up: number;
        down: number;
      };
      bollingerBands: {
        upper: number;
        middle: number;
        lower: number;
      };
      atr: number;
      volume: {
        volume: number;
        volumeSMA: number;
        volumeEMA: number;
      };
      obv: number;
      pivotPoints: {
        pivot: number;
        r1: number;
        r2: number;
        s1: number;
        s2: number;
      };
      fibonacciRetracement: {
        level0: number;
        level236: number;
        level382: number;
        level500: number;
        level618: number;
        level100: number;
      };
    };
    supportResistance: {
      support: number[];
      resistance: number[];
    };
    marketSentiment: {
      trend: string;
      strength: number;
      confidence: number;
    };
    lastUpdated: string;
    analysisPeriod: {
      days: number;
      interval: string;
    };
  };
}

interface IndicatorAnalysis {
  status: 'bullish' | 'bearish' | 'neutral';
  summary: string;
  details: string[];
}

const analyzeIndicator = (indicator: string, value: any, data: TechnicalAnalysisProps['data']): IndicatorAnalysis => {
  const currentPrice = data.currentPrice;
  
  switch (indicator) {
    case 'SMA':
      const sma20 = data.technicalIndicators.sma['20'];
      const sma50 = data.technicalIndicators.sma['50'];
      const sma200 = data.technicalIndicators.sma['200'];
      
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
      const rsi = data.technicalIndicators.rsi;
      if (rsi > 70) {
        return {
          status: 'bearish',
          summary: 'Overbought conditions',
          details: [
            `RSI at ${rsi.toFixed(2)} indicates overbought conditions`,
            'Potential for price reversal or pullback'
          ]
        };
      } else if (rsi < 30) {
        return {
          status: 'bullish',
          summary: 'Oversold conditions',
          details: [
            `RSI at ${rsi.toFixed(2)} indicates oversold conditions`,
            'Potential for price bounce or recovery'
          ]
        };
      }
      return {
        status: 'neutral',
        summary: 'RSI in neutral territory',
        details: [
          `RSI at ${rsi.toFixed(2)} is in neutral range`,
          'No strong overbought or oversold signals'
        ]
      };

    case 'MACD':
      const macd = data.technicalIndicators.macd;
      if (macd.macd > macd.signal && macd.histogram > 0) {
        return {
          status: 'bullish',
          summary: 'MACD showing bullish momentum',
          details: [
            `MACD line (${macd.macd.toFixed(2)}) is above signal line (${macd.signal.toFixed(2)})`,
            `Positive histogram (${macd.histogram.toFixed(2)}) indicates increasing momentum`
          ]
        };
      } else if (macd.macd < macd.signal && macd.histogram < 0) {
        return {
          status: 'bearish',
          summary: 'MACD showing bearish momentum',
          details: [
            `MACD line (${macd.macd.toFixed(2)}) is below signal line (${macd.signal.toFixed(2)})`,
            `Negative histogram (${macd.histogram.toFixed(2)}) indicates decreasing momentum`
          ]
        };
      }
      return {
        status: 'neutral',
        summary: 'MACD showing neutral momentum',
        details: [
          `MACD line: ${macd.macd.toFixed(2)}`,
          `Signal line: ${macd.signal.toFixed(2)}`,
          `Histogram: ${macd.histogram.toFixed(2)}`
        ]
      };

    case 'Bollinger Bands':
      const bb = data.technicalIndicators.bollingerBands;
      if (currentPrice > bb.upper) {
        return {
          status: 'bearish',
          summary: 'Price above upper Bollinger Band',
          details: [
            `Price (${currentPrice.toFixed(2)}) is above upper band (${bb.upper.toFixed(2)})`,
            'Potential for price reversal or pullback'
          ]
        };
      } else if (currentPrice < bb.lower) {
        return {
          status: 'bullish',
          summary: 'Price below lower Bollinger Band',
          details: [
            `Price (${currentPrice.toFixed(2)}) is below lower band (${bb.lower.toFixed(2)})`,
            'Potential for price bounce or recovery'
          ]
        };
      }
      return {
        status: 'neutral',
        summary: 'Price within Bollinger Bands',
        details: [
          `Price (${currentPrice.toFixed(2)}) is between bands`,
          `Upper: ${bb.upper.toFixed(2)}`,
          `Middle: ${bb.middle.toFixed(2)}`,
          `Lower: ${bb.lower.toFixed(2)}`
        ]
      };

    case 'ADX':
      const adx = data.technicalIndicators.adx;
      if (adx > 25) {
        return {
          status: 'bullish',
          summary: 'Strong trend strength',
          details: [
            `ADX at ${adx.toFixed(2)} indicates strong trend`,
            'Current trend is likely to continue'
          ]
        };
      } else if (adx < 20) {
        return {
          status: 'neutral',
          summary: 'Weak trend strength',
          details: [
            `ADX at ${adx.toFixed(2)} indicates weak trend`,
            'Market may be ranging or consolidating'
          ]
        };
      }
      return {
        status: 'neutral',
        summary: 'Moderate trend strength',
        details: [
          `ADX at ${adx.toFixed(2)} indicates moderate trend`,
          'Trend direction should be confirmed with other indicators'
        ]
      };

    case 'Ichimoku':
      const ichimoku = data.technicalIndicators.ichimoku;
      if (currentPrice > ichimoku.senkouA && currentPrice > ichimoku.senkouB) {
        return {
          status: 'bullish',
          summary: 'Price above Ichimoku Cloud',
          details: [
            `Price (${currentPrice.toFixed(2)}) is above cloud`,
            `Tenkan: ${ichimoku.tenkan.toFixed(2)}`,
            `Kijun: ${ichimoku.kijun.toFixed(2)}`,
            'Strong bullish trend'
          ]
        };
      } else if (currentPrice < ichimoku.senkouA && currentPrice < ichimoku.senkouB) {
        return {
          status: 'bearish',
          summary: 'Price below Ichimoku Cloud',
          details: [
            `Price (${currentPrice.toFixed(2)}) is below cloud`,
            `Tenkan: ${ichimoku.tenkan.toFixed(2)}`,
            `Kijun: ${ichimoku.kijun.toFixed(2)}`,
            'Strong bearish trend'
          ]
        };
      }
      return {
        status: 'neutral',
        summary: 'Price within Ichimoku Cloud',
        details: [
          `Price (${currentPrice.toFixed(2)}) is within cloud`,
          'Trend is weakening or changing'
        ]
      };

    case 'Volume':
      const volume = data.technicalIndicators.volume;
      if (volume.volume > volume.volumeSMA) {
        return {
          status: 'bullish',
          summary: 'Above average volume',
          details: [
            `Current volume (${volume.volume.toFixed(2)}) is above SMA (${volume.volumeSMA.toFixed(2)})`,
            'Strong buying pressure'
          ]
        };
      } else if (volume.volume < volume.volumeSMA) {
        return {
          status: 'bearish',
          summary: 'Below average volume',
          details: [
            `Current volume (${volume.volume.toFixed(2)}) is below SMA (${volume.volumeSMA.toFixed(2)})`,
            'Weak buying pressure'
          ]
        };
      }
      return {
        status: 'neutral',
        summary: 'Average volume',
        details: [
          `Current volume (${volume.volume.toFixed(2)}) is near SMA (${volume.volumeSMA.toFixed(2)})`,
          'Normal market activity'
        ]
      };

    case 'Pivot Points':
      const pivot = data.technicalIndicators.pivotPoints;
      if (currentPrice > pivot.r1) {
        return {
          status: 'bullish',
          summary: 'Price above R1, showing strong upward momentum',
          details: [
            `Current price (${currentPrice.toFixed(2)}) is above R1 (${pivot.r1.toFixed(2)})`,
            `Next resistance at R2: ${pivot.r2.toFixed(2)}`,
            `Support levels: S1 (${pivot.s1.toFixed(2)}), S2 (${pivot.s2.toFixed(2)})`,
            'Strong bullish momentum with potential for further gains'
          ]
        };
      } else if (currentPrice < pivot.s1) {
        return {
          status: 'bearish',
          summary: 'Price below S1, showing strong downward momentum',
          details: [
            `Current price (${currentPrice.toFixed(2)}) is below S1 (${pivot.s1.toFixed(2)})`,
            `Next support at S2: ${pivot.s2.toFixed(2)}`,
            `Resistance levels: R1 (${pivot.r1.toFixed(2)}), R2 (${pivot.r2.toFixed(2)})`,
            'Strong bearish momentum with potential for further losses'
          ]
        };
      }
      return {
        status: 'neutral',
        summary: 'Price between pivot levels, showing consolidation',
        details: [
          `Current price (${currentPrice.toFixed(2)}) is between S1 and R1`,
          `Pivot point: ${pivot.pivot.toFixed(2)}`,
          `Support: S1 (${pivot.s1.toFixed(2)}), S2 (${pivot.s2.toFixed(2)})`,
          `Resistance: R1 (${pivot.r1.toFixed(2)}), R2 (${pivot.r2.toFixed(2)})`,
          'Market is in a consolidation phase'
        ]
      };

    case 'Fibonacci':
      const fib = data.technicalIndicators.fibonacciRetracement;
      const range = fib.level100 - fib.level0;
      const currentPosition = ((currentPrice - fib.level0) / range) * 100;

      if (currentPrice > fib.level618) {
        return {
          status: 'bullish',
          summary: 'Price above 61.8% retracement, showing strong recovery',
          details: [
            `Current price (${currentPrice.toFixed(2)}) is above 61.8% retracement level`,
            `Price has recovered ${currentPosition.toFixed(1)}% of the total range`,
            'Strong bullish momentum with potential for full recovery'
          ]
        };
      } else if (currentPrice < fib.level382) {
        return {
          status: 'bearish',
          summary: 'Price below 38.2% retracement, showing significant pullback',
          details: [
            `Current price (${currentPrice.toFixed(2)}) is below 38.2% retracement level`,
            `Price has retraced ${(100 - currentPosition).toFixed(1)}% of the total range`,
            'Significant bearish momentum with potential for further decline'
          ]
        };
      }
      return {
        status: 'neutral',
        summary: 'Price in middle retracement zone',
        details: [
          `Current price (${currentPrice.toFixed(2)}) is between 38.2% and 61.8% retracement levels`,
          `Price has retraced ${currentPosition.toFixed(1)}% of the total range`,
          'Market is in a balanced retracement zone'
        ]
      };

    default:
      return {
        status: 'neutral',
        summary: 'No analysis available',
        details: ['Indicator analysis not implemented']
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
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'bullish':
        return 'text-green-500';
      case 'bearish':
        return 'text-red-500';
      default:
        return 'text-yellow-500';
    }
  };

  return (
    <div className="p-6 bg-zinc-800 rounded-lg">
      {/* Price Section */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          {data.image && (
            <img 
              src={data.image} 
              alt={`${data.symbol} icon`}
              className="w-12 h-12 rounded-full"
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold">
                {data.symbol.toUpperCase()}
              </h3>
              {data.name && (
                <span className="text-lg text-zinc-400">
                  ({data.name})
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-3xl font-bold flex items-center gap-2 mt-2">
          $
          {formatNumber(data.currentPrice)}
        </div>
        <div className="flex gap-4 mt-2">
          <div className="flex items-center gap-1">
            <span className="text-sm text-zinc-400">24h:</span>
            <span className={`text-sm ${data.priceChange['24h'] >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPercentage(data.priceChange['24h'])}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-zinc-400">7d:</span>
            <span className={`text-sm ${data.priceChange['7d'] >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPercentage(data.priceChange['7d'])}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-zinc-400">30d:</span>
            <span className={`text-sm ${data.priceChange['30d'] >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPercentage(data.priceChange['30d'])}
            </span>
          </div>
        </div>
      </div>

      {/* Market Summary */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">
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
                <span className="text-sm text-zinc-300">${formatNumber(data.currentPrice * (1 + Math.abs(data.priceChange['24h'] / 100)))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">24h Low</span>
                <span className="text-sm text-zinc-300">${formatNumber(data.currentPrice * (1 - Math.abs(data.priceChange['24h'] / 100)))}</span>
              </div>
            </div>
          </div>

          {/* Key Levels */}
          <div className="bg-zinc-900 p-3 rounded">
            <div className="text-sm text-zinc-400 mb-2">Key Levels</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Nearest Support</span>
                <span className="text-sm text-zinc-300">${formatNumber(data.supportResistance.support[0])}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Nearest Resistance</span>
                <span className="text-sm text-zinc-300">${formatNumber(data.supportResistance.resistance[0])}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Pivot Point</span>
                <span className="text-sm text-zinc-300">${formatNumber(data.technicalIndicators.pivotPoints.pivot)}</span>
              </div>
            </div>
          </div>

          {/* Market Metrics */}
          <div className="bg-zinc-900 p-3 rounded">
            <div className="text-sm text-zinc-400 mb-2">Market Metrics</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Volatility (ATR)</span>
                <span className="text-sm text-zinc-300">{formatNumber(data.technicalIndicators.atr)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Volume 24h</span>
                <span className="text-sm text-zinc-300">{formatNumber(data.technicalIndicators.volume.volume)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Trend Strength (ADX)</span>
                <span className="text-sm text-zinc-300">{formatNumber(data.technicalIndicators.adx)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Analysis */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">
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
        <h3 className="text-lg font-semibold mb-4">
          Technical Indicators
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Moving Averages */}
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-400 mb-2">Moving Averages</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">SMA 20</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.sma['20'])}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">SMA 50</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.sma['50'])}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">SMA 200</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.sma['200'])}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">EMA 9</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.ema['9'])}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">EMA 21</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.ema['21'])}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">EMA 50</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.ema['50'])}</span>
              </div>
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
              <div className="flex justify-between">
                <span className="text-sm">RSI</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.rsi)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">StochRSI</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.stochRSI)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">CCI</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.cci)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">MFI</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.mfi)}</span>
              </div>
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
              <div className="flex justify-between">
                <span className="text-sm">ADX</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.adx)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">+DI</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.dmi.plus)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">-DI</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.dmi.minus)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Aroon Up</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.aroon.up)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Aroon Down</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.aroon.down)}</span>
              </div>
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
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-400 mb-2">MACD</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">MACD Line</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.macd.macd)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Signal Line</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.macd.signal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Histogram</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.macd.histogram)}</span>
              </div>
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
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-400 mb-2">Ichimoku Cloud</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Tenkan</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.ichimoku.tenkan)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Kijun</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.ichimoku.kijun)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Senkou A</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.ichimoku.senkouA)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Senkou B</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.ichimoku.senkouB)}</span>
              </div>
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
              <div className="flex justify-between">
                <span className="text-sm">Volume</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.volume.volume)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Volume SMA</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.volume.volumeSMA)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Volume EMA</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.volume.volumeEMA)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">OBV</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.obv)}</span>
              </div>
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
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-400 mb-2">Bollinger Bands</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Upper Band</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.bollingerBands.upper)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Middle Band</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.bollingerBands.middle)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Lower Band</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.bollingerBands.lower)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">ATR</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.atr)}</span>
              </div>
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
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-400 mb-2">Pivot Points</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Pivot</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.pivotPoints.pivot)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">R1</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.pivotPoints.r1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">R2</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.pivotPoints.r2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">S1</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.pivotPoints.s1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">S2</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.pivotPoints.s2)}</span>
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
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-400 mb-2">Fibonacci Retracement</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Level 0%</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.fibonacciRetracement.level0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Level 23.6%</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.fibonacciRetracement.level236)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Level 38.2%</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.fibonacciRetracement.level382)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Level 50%</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.fibonacciRetracement.level500)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Level 61.8%</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.fibonacciRetracement.level618)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Level 100%</span>
                <span className="font-medium">{formatNumber(data.technicalIndicators.fibonacciRetracement.level100)}</span>
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
            <div className="text-sm text-zinc-400 mb-2">Support Levels</div>
            <div className="space-y-2">
              {data.supportResistance.support.map((level, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-sm">Level {index + 1}</span>
                  <span className="font-medium">{formatNumber(level)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-400 mb-2">Resistance Levels</div>
            <div className="space-y-2">
              {data.supportResistance.resistance.map((level, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-sm">Level {index + 1}</span>
                  <span className="font-medium">{formatNumber(level)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Market Sentiment */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">
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
              <span className="text-sm flex items-center gap-2">
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
              <span className={`font-medium ${getStatusColor(data.marketSentiment.trend as 'bullish' | 'bearish' | 'neutral')}`}>
                {data.marketSentiment.trend.charAt(0).toUpperCase() + data.marketSentiment.trend.slice(1)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center gap-2">
                Strength
                <div className="group relative">
                  <Info className="h-3 w-3 text-zinc-500 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-64 bg-zinc-800 text-xs text-zinc-300 p-3 rounded-lg shadow-lg z-10">
                    <div className="font-medium mb-2">Strength Calculation</div>
                    <div className="space-y-1">
                      <div>• Based on 24h price change</div>
                      <div>• Calculated as: (price_change * 10)</div>
                      <div>• Capped between -100% and +100%</div>
                      <div className="mt-2 text-zinc-400">
                        Higher strength indicates stronger price movement in the trend direction.
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-zinc-800"></div>
                  </div>
                </div>
              </span>
              <span className={`font-medium ${getStatusColor(data.marketSentiment.trend as 'bullish' | 'bearish' | 'neutral')}`}>
                {data.marketSentiment.strength.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Confidence</span>
              <span className={`font-medium ${getStatusColor(data.marketSentiment.trend as 'bullish' | 'bearish' | 'neutral')}`}>
                {data.marketSentiment.confidence.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Period */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-zinc-400 gap-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Analysis Period: {data.analysisPeriod.days} days ({data.analysisPeriod.interval})</span>
        </div>
        <div>Last Updated: {new Date(data.lastUpdated).toLocaleString()}</div>
      </div>
    </div>
  );
};

export default TechnicalAnalysis; 