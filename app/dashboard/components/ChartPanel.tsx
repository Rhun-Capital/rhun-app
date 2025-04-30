'use client';

import { useState, useEffect } from 'react';

interface ChartPanelProps {
  darkMode: boolean;
  tokenAddress: string;
  chainId: string;
}

export default function ChartPanel({ darkMode, tokenAddress, chainId }: ChartPanelProps) {
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');
  const [timeframe, setTimeframe] = useState<'1H' | '4H' | '1D' | '1W' | '1M'>('1D');

  return (
    <div className={`${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex space-x-1">
          <button 
            onClick={() => setChartType('candlestick')}
            className={`px-2 py-1 text-xs font-mono rounded ${
              chartType === 'candlestick' 
                ? darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-600 text-white' 
                : darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Candles
          </button>
          <button 
            onClick={() => setChartType('line')}
            className={`px-2 py-1 text-xs font-mono rounded ${
              chartType === 'line' 
                ? darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-600 text-white' 
                : darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Line
          </button>
        </div>
        
        <div className="flex space-x-1">
          {(['1H', '4H', '1D', '1W', '1M'] as const).map((tf) => (
            <button 
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 text-xs font-mono rounded ${
                timeframe === tf
                  ? darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-600 text-white' 
                  : darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      
      {/* Chart placeholder - would be replaced with actual chart library */}
      <div 
        className={`h-[300px] ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-md p-2 flex flex-col justify-center items-center`}
      >
        {/* Chart visualization - In a real implementation, this would be replaced with a charting library like TradingView */}
        <div className="relative w-full h-full">
          {/* Simulate chart with dummy SVG */}
          <DummyChartSVG darkMode={darkMode} chartType={chartType} />
          
          {/* Chart axes and labels */}
          <div className="absolute top-2 left-2 text-xs font-mono opacity-70">
            ${generateRandomPrice()}
          </div>
          <div className="absolute bottom-2 left-2 text-xs font-mono opacity-70">
            ${generateRandomPrice(true)}
          </div>
          <div className="absolute bottom-2 right-2 text-xs font-mono opacity-70">
            {formatTime(timeframe)}
          </div>
          
          {/* Price overlay */}
          <div className="absolute top-2 right-2 text-xs font-mono bg-opacity-80 px-2 py-1 rounded flex items-center space-x-2">
            <span>Last: ${generateRandomPrice()}</span>
            <span className="text-green-500">+2.34%</span>
          </div>
        </div>
        
        <div className="text-sm mt-2 font-mono text-gray-500">
          This is a simulated chart. In production, integrate TradingView or similar.
        </div>
      </div>
    </div>
  );
}

// Helper functions to make the dummy chart look more realistic
function generateRandomPrice(isLow = false) {
  const base = isLow ? 10 : 15;
  return (base + Math.random() * 5).toFixed(2);
}

function formatTime(timeframe: string) {
  const date = new Date();
  switch (timeframe) {
    case '1H':
      date.setHours(date.getHours() - 1);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    case '4H':
      date.setHours(date.getHours() - 4);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    case '1D':
      date.setDate(date.getDate() - 1);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    case '1W':
      date.setDate(date.getDate() - 7);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    case '1M':
      date.setMonth(date.getMonth() - 1);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    default:
      return date.toLocaleDateString();
  }
}

// Simple SVG chart component for visualization purposes
// In a real implementation, this would be replaced with a charting library
function DummyChartSVG({ darkMode, chartType }: { darkMode: boolean, chartType: string }) {
  // Generate some random data points for the chart
  const generateRandomPoints = (count: number, height: number, width: number) => {
    const points = [];
    for (let i = 0; i < count; i++) {
      const x = (i / (count - 1)) * width;
      
      // Add some realistic-looking price movements
      const trend = Math.sin(i / 10) * 20; // Overall trend
      const noise = Math.random() * 10 - 5; // Random noise
      const y = height / 2 - trend - noise;
      
      points.push({ x, y });
    }
    return points;
  };
  
  const width = 100;
  const height = 100;
  const points = generateRandomPoints(50, height, width);
  
  if (chartType === 'line') {
    // Generate a path for a line chart
    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <path
          d={pathData}
          stroke={darkMode ? '#60a5fa' : '#2563eb'}
          strokeWidth="1"
          fill="none"
        />
        {/* Add some area fill below the line */}
        <path
          d={`${pathData} L ${width} ${height} L 0 ${height} Z`}
          fill={darkMode ? 'rgba(96, 165, 250, 0.1)' : 'rgba(37, 99, 235, 0.1)'}
        />
        
        {/* Grid lines */}
        {Array.from({ length: 5 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={height * (i + 1) / 6}
            x2={width}
            y2={height * (i + 1) / 6}
            stroke={darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
            strokeDasharray="1,1"
          />
        ))}
        
        {Array.from({ length: 5 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={width * (i + 1) / 6}
            y1="0"
            x2={width * (i + 1) / 6}
            y2={height}
            stroke={darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
            strokeDasharray="1,1"
          />
        ))}
      </svg>
    );
  } else {
    // Candlestick chart visualization
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {/* Grid lines */}
        {Array.from({ length: 5 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={height * (i + 1) / 6}
            x2={width}
            y2={height * (i + 1) / 6}
            stroke={darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
            strokeDasharray="1,1"
          />
        ))}
        
        {Array.from({ length: 10 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={width * (i + 1) / 11}
            y1="0"
            x2={width * (i + 1) / 11}
            y2={height}
            stroke={darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
            strokeDasharray="1,1"
          />
        ))}
        
        {/* Generate candlesticks */}
        {Array.from({ length: 20 }).map((_, i) => {
          const x = (i + 0.5) * (width / 20);
          const candleWidth = width / 30;
          
          const open = height / 2 + (Math.random() * 20 - 10);
          const close = height / 2 + (Math.random() * 20 - 10);
          const high = Math.min(open, close) - Math.random() * 10;
          const low = Math.max(open, close) + Math.random() * 10;
          
          const isGreen = close < open;
          
          return (
            <g key={i}>
              {/* Wick */}
              <line
                x1={x}
                y1={high}
                x2={x}
                y2={low}
                stroke={darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'}
                strokeWidth="0.5"
              />
              
              {/* Candle body */}
              <rect
                x={x - candleWidth / 2}
                y={Math.min(open, close)}
                width={candleWidth}
                height={Math.abs(close - open)}
                fill={isGreen ? (darkMode ? '#10b981' : '#047857') : (darkMode ? '#ef4444' : '#b91c1c')}
              />
            </g>
          );
        })}
      </svg>
    );
  }
} 