'use client';

import { useState, useEffect } from 'react';
import { getMarketCategories } from '@/utils/agent-tools';

interface HeatmapPanelProps {
  darkMode: boolean;
}

export default function HeatmapPanel({ darkMode }: HeatmapPanelProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'performance' | 'market-cap'>('performance');

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const data = await getMarketCategories();
        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching market categories:', error);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategories();
    
    // Refresh every 5 minutes
    const intervalId = setInterval(fetchCategories, 300000);
    return () => clearInterval(intervalId);
  }, []);

  // Get color based on percentage change
  const getColorClass = (change: number) => {
    if (change >= 10) return 'bg-green-600';
    if (change >= 5) return 'bg-green-500';
    if (change >= 2) return 'bg-green-400';
    if (change >= 0) return 'bg-green-300';
    if (change >= -2) return 'bg-red-300';
    if (change >= -5) return 'bg-red-400';
    if (change >= -10) return 'bg-red-500';
    return 'bg-red-600';
  };

  // Get color based on market cap size
  const getMarketCapColorClass = (marketCap: number) => {
    if (marketCap >= 100e9) return 'bg-blue-600';
    if (marketCap >= 50e9) return 'bg-blue-500';
    if (marketCap >= 10e9) return 'bg-blue-400';
    if (marketCap >= 5e9) return 'bg-blue-300';
    if (marketCap >= 1e9) return 'bg-blue-200';
    return 'bg-blue-100';
  };

  // Format currency for display
  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className={`rounded-md overflow-hidden ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-300'}`}>
      <div className={`p-3 ${darkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold font-mono">Sector Heatmap</h3>
          
          <div className="flex space-x-1">
            <button
              onClick={() => setView('performance')}
              className={`px-2 py-0.5 text-xs font-mono rounded ${
                view === 'performance' 
                  ? darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-600 text-white' 
                  : darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              24h %
            </button>
            <button
              onClick={() => setView('market-cap')}
              className={`px-2 py-0.5 text-xs font-mono rounded ${
                view === 'market-cap' 
                  ? darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-600 text-white' 
                  : darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Market Cap
            </button>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 mb-1">
          {view === 'performance' 
            ? 'Color represents 24h % change' 
            : 'Color represents market cap size'}
        </div>
      </div>
      
      <div className="p-3">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No sector data available
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {categories.map((category) => (
              <div 
                key={category.id} 
                className={`p-2 rounded-md text-xs ${
                  view === 'performance' 
                    ? getColorClass(category.change24h)
                    : getMarketCapColorClass(category.marketCap)
                } text-white`}
              >
                <div className="font-semibold truncate">{category.name}</div>
                <div className="flex justify-between mt-1">
                  <span>{formatCurrency(category.marketCap)}</span>
                  <span className={
                    category.change24h >= 0 ? 'text-green-100' : 'text-red-100'
                  }>
                    {category.change24h >= 0 ? '+' : ''}{category.change24h.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className={`px-3 py-2 text-xs ${darkMode ? 'border-t border-gray-800' : 'border-t border-gray-300'}`}>
        <div className="flex items-center justify-center space-x-2">
          {view === 'performance' ? (
            <>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-sm bg-red-600 mr-1"></div>
                <span>&lt;-10%</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-sm bg-red-400 mr-1"></div>
                <span>-5%</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-sm bg-green-400 mr-1"></div>
                <span>+5%</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-sm bg-green-600 mr-1"></div>
                <span>&gt;+10%</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-sm bg-blue-200 mr-1"></div>
                <span>&lt;$1B</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-sm bg-blue-400 mr-1"></div>
                <span>$10B</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-sm bg-blue-600 mr-1"></div>
                <span>&gt;$100B</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 