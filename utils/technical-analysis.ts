export interface PriceData {
  timestamp: Date;
  price: number;
}

export function calculateSMA(prices: PriceData[], period: number): number {
  if (prices.length < period) return 0;
  const sum = prices.slice(-period).reduce((acc, curr) => acc + curr.price, 0);
  return sum / period;
}

export function calculateRSI(prices: PriceData[], period: number = 14): number {
  if (prices.length < period + 1) return 0;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = prices[prices.length - i].price - prices[prices.length - i - 1].price;
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

export function calculateEMA(prices: PriceData[], period: number): number {
  if (prices.length < period) return 0;
  
  const multiplier = 2 / (period + 1);
  let ema = calculateSMA(prices.slice(0, period), period);
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i].price - ema) * multiplier + ema;
  }
  
  return ema;
}

export function calculateMACD(prices: PriceData[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;
  const signal = calculateEMA(prices, 9);
  const histogram = macd - signal;
  
  return { macd, signal, histogram };
}

export function calculateStochRSI(prices: PriceData[], period: number = 14): number {
  const rsi = calculateRSI(prices, period);
  const minRSI = Math.min(...prices.slice(-period).map(p => p.price));
  const maxRSI = Math.max(...prices.slice(-period).map(p => p.price));
  
  return (rsi - minRSI) / (maxRSI - minRSI) * 100;
}

export function calculateCCI(prices: PriceData[], period: number = 20): number {
  if (prices.length < period) return 0;
  
  const typicalPrices = prices.slice(-period).map(p => p.price);
  const sma = calculateSMA(prices.slice(-period), period);
  const meanDeviation = typicalPrices.reduce((acc, curr) => acc + Math.abs(curr - sma), 0) / period;
  
  return (prices[prices.length - 1].price - sma) / (0.015 * meanDeviation);
}

export function calculateMFI(prices: PriceData[], period: number = 14): number {
  if (prices.length < period + 1) return 0;
  
  let positiveFlow = 0;
  let negativeFlow = 0;
  
  for (let i = 1; i <= period; i++) {
    const typicalPrice = (prices[prices.length - i].price + prices[prices.length - i].price + prices[prices.length - i].price) / 3;
    const prevTypicalPrice = (prices[prices.length - i - 1].price + prices[prices.length - i - 1].price + prices[prices.length - i - 1].price) / 3;
    
    if (typicalPrice > prevTypicalPrice) {
      positiveFlow += typicalPrice;
    } else {
      negativeFlow += typicalPrice;
    }
  }
  
  const moneyRatio = positiveFlow / negativeFlow;
  return 100 - (100 / (1 + moneyRatio));
}

export function calculateADX(prices: PriceData[], period: number = 14): number {
  if (prices.length < period * 2) return 0;
  
  const plusDM = calculateDMI(prices, period).plus;
  const minusDM = calculateDMI(prices, period).minus;
  const tr = calculateATR(prices, period);
  
  const plusDI = 100 * (plusDM / tr);
  const minusDI = 100 * (minusDM / tr);
  
  const dx = 100 * Math.abs(plusDI - minusDI) / (plusDI + minusDI);
  return calculateEMA(prices.map((p, i) => ({ timestamp: p.timestamp, price: dx })), period);
}

export function calculateDMI(prices: PriceData[], period: number = 14): { plus: number; minus: number } {
  if (prices.length < period + 1) return { plus: 0, minus: 0 };
  
  let plusDM = 0;
  let minusDM = 0;
  
  for (let i = 1; i <= period; i++) {
    const upMove = prices[prices.length - i].price - prices[prices.length - i - 1].price;
    const downMove = prices[prices.length - i - 1].price - prices[prices.length - i].price;
    
    if (upMove > downMove && upMove > 0) plusDM += upMove;
    if (downMove > upMove && downMove > 0) minusDM += downMove;
  }
  
  return { plus: plusDM / period, minus: minusDM / period };
}

export function calculateIchimoku(prices: PriceData[]): {
  tenkan: number;
  kijun: number;
  senkouA: number;
  senkouB: number;
} {
  const high9 = Math.max(...prices.slice(-9).map(p => p.price));
  const low9 = Math.min(...prices.slice(-9).map(p => p.price));
  const high26 = Math.max(...prices.slice(-26).map(p => p.price));
  const low26 = Math.min(...prices.slice(-26).map(p => p.price));
  const high52 = Math.max(...prices.slice(-52).map(p => p.price));
  const low52 = Math.min(...prices.slice(-52).map(p => p.price));
  
  const tenkan = (high9 + low9) / 2;
  const kijun = (high26 + low26) / 2;
  const senkouA = (tenkan + kijun) / 2;
  const senkouB = (high52 + low52) / 2;
  
  return { tenkan, kijun, senkouA, senkouB };
}

export function calculateAroon(prices: PriceData[], period: number = 14): { up: number; down: number } {
  if (prices.length < period) return { up: 0, down: 0 };
  
  const highIndex = prices.slice(-period).reduce((maxIndex, curr, i, arr) => 
    curr.price > arr[maxIndex].price ? i : maxIndex, 0);
  const lowIndex = prices.slice(-period).reduce((minIndex, curr, i, arr) => 
    curr.price < arr[minIndex].price ? i : minIndex, 0);
  
  return {
    up: ((period - highIndex) / period) * 100,
    down: ((period - lowIndex) / period) * 100
  };
}

export function calculateATR(prices: PriceData[], period: number = 14): number {
  if (prices.length < period + 1) return 0;
  
  let trSum = 0;
  for (let i = 1; i <= period; i++) {
    const high = prices[prices.length - i].price;
    const low = prices[prices.length - i].price;
    const prevClose = prices[prices.length - i - 1].price;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trSum += tr;
  }
  
  return trSum / period;
}

export function calculateVolumeMetrics(prices: PriceData[]): {
  volume: number;
  volumeSMA: number;
  volumeEMA: number;
} {
  const volume = prices[prices.length - 1].price;
  const volumeSMA = calculateSMA(prices, 20);
  const volumeEMA = calculateEMA(prices, 20);
  
  return { volume, volumeSMA, volumeEMA };
}

export function calculateOBV(prices: PriceData[]): number {
  let obv = 0;
  
  for (let i = 1; i < prices.length; i++) {
    if (prices[i].price > prices[i - 1].price) {
      obv += prices[i].price;
    } else if (prices[i].price < prices[i - 1].price) {
      obv -= prices[i].price;
    }
  }
  
  return obv;
}

export function calculatePivotPoints(prices: PriceData[]): {
  pivot: number;
  r1: number;
  r2: number;
  s1: number;
  s2: number;
} {
  const high = Math.max(...prices.map(p => p.price));
  const low = Math.min(...prices.map(p => p.price));
  const close = prices[prices.length - 1].price;
  
  const pivot = (high + low + close) / 3;
  const r1 = 2 * pivot - low;
  const r2 = pivot + (high - low);
  const s1 = 2 * pivot - high;
  const s2 = pivot - (high - low);
  
  return { pivot, r1, r2, s1, s2 };
}

export function calculateFibonacciRetracement(prices: PriceData[]): {
  level0: number;
  level236: number;
  level382: number;
  level500: number;
  level618: number;
  level100: number;
} {
  const high = Math.max(...prices.map(p => p.price));
  const low = Math.min(...prices.map(p => p.price));
  const diff = high - low;
  
  return {
    level0: high,
    level236: high - (diff * 0.236),
    level382: high - (diff * 0.382),
    level500: high - (diff * 0.500),
    level618: high - (diff * 0.618),
    level100: low
  };
}

export function calculateBollingerBands(prices: PriceData[], period: number = 20): { upper: number; middle: number; lower: number } {
  const sma = calculateSMA(prices, period);
  const stdDev = Math.sqrt(
    prices.slice(-period).reduce((acc, curr) => acc + Math.pow(curr.price - sma, 2), 0) / period
  );
  
  return {
    upper: sma + (2 * stdDev),
    middle: sma,
    lower: sma - (2 * stdDev)
  };
}

export function calculateSupportResistance(prices: PriceData[]): { support: number[]; resistance: number[] } {
  const support: number[] = [];
  const resistance: number[] = [];
  
  for (let i = 1; i < prices.length - 1; i++) {
    if (prices[i].price < prices[i - 1].price && prices[i].price < prices[i + 1].price) {
      support.push(prices[i].price);
    }
    if (prices[i].price > prices[i - 1].price && prices[i].price > prices[i + 1].price) {
      resistance.push(prices[i].price);
    }
  }
  
  return { support, resistance };
}

export function calculateMarketSentiment(
  prices: PriceData[], 
  rsi: number, 
  bollingerBands: { upper: number; middle: number; lower: number }
): { trend: string; strength: number; confidence: number } {
  const currentPrice = prices[prices.length - 1].price;
  const sma20 = calculateSMA(prices.slice(-20), 20);
  const sma50 = calculateSMA(prices.slice(-50), 50);
  
  let trend = 'neutral';
  let strength = 0.5; // Start at 50%
  let confidence = 0.5; // Start at 50%
  
  // Determine trend and calculate strength
  if (currentPrice > sma20 && sma20 > sma50) {
    trend = 'bullish';
    // Calculate strength based on how far price is above SMAs
    const priceToSMA20Ratio = (currentPrice - sma20) / sma20;
    const sma20ToSMA50Ratio = (sma20 - sma50) / sma50;
    strength = 0.5 + (priceToSMA20Ratio * 2) + (sma20ToSMA50Ratio);
  } else if (currentPrice < sma20 && sma20 < sma50) {
    trend = 'bearish';
    // Calculate strength for bearish trend
    const priceToSMA20Ratio = (sma20 - currentPrice) / sma20;
    const sma20ToSMA50Ratio = (sma50 - sma20) / sma50;
    strength = 0.5 + (priceToSMA20Ratio * 2) + (sma20ToSMA50Ratio);
  } else {
    // Mixed signals - reduce strength
    strength = 0.3;
  }
  
  // Calculate confidence based on multiple indicators
  let confidenceScore = 0.5; // Start at 50%
  
  // RSI confirmation
  if ((trend === 'bullish' && rsi > 60) || (trend === 'bearish' && rsi < 40)) {
    confidenceScore += 0.15;
  }
  
  // Bollinger Bands confirmation
  if ((trend === 'bullish' && currentPrice > bollingerBands.upper) ||
      (trend === 'bearish' && currentPrice < bollingerBands.lower)) {
    confidenceScore += 0.15;
  }
  
  // Strong trend confirmation from SMAs
  if (Math.abs(sma20 - sma50) / sma50 > 0.02) {
    confidenceScore += 0.1;
  }
  
  // Volume confirmation (if available)
  // Add additional confidence factors here
  
  // Ensure values are between 0 and 1 (0% to 100%)
  strength = Math.min(Math.max(strength, 0), 1);
  confidence = Math.min(Math.max(confidenceScore, 0), 1);
  
  return { trend, strength, confidence };
} 