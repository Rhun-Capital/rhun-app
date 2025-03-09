
// components/tools/StockAnalysis.tsx
import { access } from 'fs';
import React, { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface StockAnalysisProps {
  toolCallId: string;
  toolInvocation: any;
}

export default function StockAnalysis({ toolCallId, toolInvocation }: StockAnalysisProps) {
  // Initialize data more safely - ensure we capture the processing status
  const [data, setData] = useState(toolInvocation.result);

  const [isPolling, setIsPolling] = useState(false);
  const { getAccessToken } = usePrivy();

  // Add a useEffect to update state after initial render if needed
  useEffect(() => {
    // If data is missing a requestId but toolInvocation has it, update the state
    setData(toolInvocation.result);

  }, [toolInvocation]);

  useEffect(() => {

    if (!data) {
      return;
    }
  
    // If result is still processing and has a requestId, start polling
    if (data?.status === 'processing' && data?.requestId) {
      setIsPolling(true);
      
      let attempts = 0;
      const maxAttempts = 30; // Poll for up to 30 seconds
      
      const pollInterval = setInterval(async () => {
        attempts++;
        
        try {
          const accessToken = await getAccessToken();

          // Call the API endpoint to check status
          const response = await fetch(`/api/financial-data/status?requestId=${data.requestId}`, {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          });
          const statusData = await response.json();
          
          if (statusData.status === 'completed') {
            setData(JSON.parse(statusData.results)[data.ticker]?.report);
            clearInterval(pollInterval);
            setIsPolling(false);
          }
          
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setIsPolling(false);
          }
        } catch (error) {
          console.error('Error polling for status:', error);
          clearInterval(pollInterval);
          setIsPolling(false);
        }
      }, 3000); // Check every 3 seconds
      
      return () => clearInterval(pollInterval);
    }
  }, [data]);

  if (!data) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2">
        <div className="text-zinc-400">Loading stock analysis data...</div>
      </div>
    );
  }
  
  if (data.error) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2 text-white">
        <div className="text-red-400">{data.error}</div>
      </div>
    );
  }
  
  if (data.status === 'processing') {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2 text-white">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
          <div className="text-indigo-400">
            {isPolling ? "Analysis in progress..." : data.message || "Analysis in progress..."}
          </div>
        </div>
        <div className="text-zinc-400 text-sm mt-2">Stock symbol: {data.ticker}</div>
      </div>
    );
  }
  
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2 text-white">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          {data.logo_url && (
            <img 
              src={data.logo_url} 
              alt={`${data.name} logo`} 
              className="w-8 h-8 mr-2 object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none' }} // Hide if image fails to load
            />
          )}
          <h3 className="text-xl font-bold">{data.ticker} ({data.name || data.ticker})</h3>
        </div>
        <span className="text-2xl font-semibold">${data.current_price?.toFixed(2) || 'N/A'}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="text-sm font-semibold text-zinc-400">Market Cap</h4>
          <div className="text-lg">
            {typeof data.market_cap === 'number' 
            ? `$${data.market_cap >= 1e12 
              ? (data.market_cap / 1e12).toFixed(2) + 'T'
              : data.market_cap >= 1e9 
              ? (data.market_cap / 1e9).toFixed(2) + 'B' 
              : (data.market_cap / 1e6).toFixed(2) + 'M'}`
            : 'N/A'}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-zinc-400">P/E Ratio</h4>
          <div className="text-lg">{typeof data.pe_ratio === 'number' ? data.pe_ratio.toFixed(2) : 'N/A'}</div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-zinc-400">Analyst Target</h4>
          <div className="text-lg">
            ${typeof data.analyst_consensus?.avg_price_target === 'number' 
              ? data.analyst_consensus.avg_price_target.toFixed(2) 
              : 'N/A'}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-zinc-400">Upside</h4>
          <div className={`text-lg ${
            data.analyst_consensus?.upside_potential > 0 ? 'text-green-500' : 
            data.analyst_consensus?.upside_potential < 0 ? 'text-red-500' : ''
          }`}>
            {typeof data.analyst_consensus?.upside_potential === 'number' 
              ? data.analyst_consensus.upside_potential.toFixed(2) + '%' 
              : 'N/A'}
          </div>
        </div>
      </div>
      
      {data.financial_health && (
        <div className="border-t border-zinc-700 pt-3">
          <h4 className="font-semibold mb-2">Financial Health</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h5 className="text-sm text-zinc-400">Gross Margin</h5>
              <div>{typeof data.financial_health?.gross_margin === 'number' 
                ? (data.financial_health.gross_margin * 100).toFixed(2) + '%' 
                : 'N/A'}</div>
            </div>
            <div>
              <h5 className="text-sm text-zinc-400">Net Margin</h5>
              <div>{typeof data.financial_health?.net_margin === 'number' 
                ? (data.financial_health.net_margin * 100).toFixed(2) + '%' 
                : 'N/A'}</div>
            </div>
            <div>
              <h5 className="text-sm text-zinc-400">Debt/Equity</h5>
              <div>{typeof data.financial_health?.debt_to_equity === 'number' 
                ? data.financial_health.debt_to_equity.toFixed(2) 
                : 'N/A'}</div>
            </div>
            <div>
              <h5 className="text-sm text-zinc-400">Current Ratio</h5>
              <div>{typeof data.financial_health?.current_ratio === 'number' 
                ? data.financial_health.current_ratio.toFixed(2) 
                : 'N/A'}</div>
            </div>
          </div>
        </div>
      )}
      
      {data.news_sentiment && (
        <div className="border-t border-zinc-700 pt-3 mt-3">
          <h4 className="font-semibold mb-2">News Sentiment</h4>
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            data.news_sentiment?.sentiment === 'Positive' ? 'bg-green-800 text-green-100' :
            data.news_sentiment?.sentiment === 'Negative' ? 'bg-red-800 text-red-100' :
            'bg-zinc-700 text-zinc-300'
          }`}>
            {data.news_sentiment?.sentiment || 'Neutral'} ({typeof data.news_sentiment?.average_score === 'number' 
              ? data.news_sentiment.average_score.toFixed(2) 
              : 'N/A'})
          </div>
          <div className="text-sm text-zinc-400 mt-1">
            Based on {data.news_sentiment?.article_count || 0} recent articles
          </div>
          
          {/* Display article links if available */}
          {data.news_sentiment?.articles && data.news_sentiment.articles.length > 0 && (
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              <div className="text-sm font-medium">Recent News:</div>
              {data.news_sentiment.articles.map((article: { link: string; title: string; publisher: string; date: string }, index: number) => (
                <div key={index} className="text-xs border-l-2 border-zinc-600 pl-2">
                  <a 
                    href={article.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300"
                  >
                    {article.title}
                  </a>
                  <div className="text-zinc-500">{article.publisher} • {new Date(article.date).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {data.options_sentiment && (
        <div className="border-t border-zinc-700 pt-3 mt-3">
          <h4 className="font-semibold mb-2">Options Sentiment</h4>
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            data.options_sentiment?.sentiment === 'Bullish' ? 'bg-green-800 text-green-100' :
            data.options_sentiment?.sentiment === 'Bearish' ? 'bg-red-800 text-red-100' :
            'bg-zinc-700 text-zinc-300'
          }`}>
            {data.options_sentiment?.sentiment || 'Neutral'}
          </div>
          <div className="text-sm text-zinc-400 mt-1">
            Call/Put Ratio: {typeof data.options_sentiment?.call_put_ratio === 'number' 
              ? data.options_sentiment.call_put_ratio.toFixed(2) 
              : 'N/A'}
          </div>
        </div>
      )}
      
      {/* Last update timestamp */}
      <div className="text-xs text-zinc-500 mt-4 text-right">
        Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  );
}
