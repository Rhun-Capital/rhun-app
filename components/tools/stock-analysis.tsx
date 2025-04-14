// components/tools/StockAnalysis.tsx
// This component displays stock analysis data and automatically fetches and appends
// the complete financial analysis data from DynamoDB when the analysis is complete.
// It uses the /api/financial-data/complete endpoint to get the full data
// and appends the analysis to the chat using the append prop.

import React, { useState, useEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSearchParams } from 'next/navigation';
import type { Message, CreateMessage } from 'ai';

interface StockAnalysisProps {
  toolCallId: string;
  toolInvocation: any;
  append?: (message: Message | CreateMessage, options?: any) => Promise<string | null | undefined>;
}

export default function StockAnalysis({ toolCallId, toolInvocation, append }: StockAnalysisProps) {
  // Initialize data and state
  const [data, setData] = useState(toolInvocation.result);
  const [isPolling, setIsPolling] = useState(false);
  const [hasProcessed, setHasProcessed] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const { getAccessToken } = usePrivy();
  const searchParams = useSearchParams();
  const chatId = decodeURIComponent(searchParams.get('chatId') || '');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Format market cap in a human-readable format
  const formatMarketCap = (value: number | undefined): string => {
    if (typeof value !== 'number' || isNaN(value)) return 'N/A';
    
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    
    return value.toString();
  };

  // Update data from prop
  useEffect(() => {
    setData(toolInvocation.result);
    
    // If this is the first time receiving a processing status with requestId, start polling
    if (
      toolInvocation.result?.status === 'processing' && 
      toolInvocation.result?.requestId && 
      !requestId
    ) {
      console.log(`Setting requestId: ${toolInvocation.result.requestId}`);
      setRequestId(toolInvocation.result.requestId);
    }
  }, [toolInvocation, requestId]);

  // Separate effect for polling to avoid conflicts
  useEffect(() => {
    // Only run polling if we have a requestId and haven't processed yet
    if (!requestId || hasProcessed) {
      return;
    }

    console.log(`Starting to poll for requestId: ${requestId}`);
    setIsPolling(true);
    
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Set up polling interval
    const pollStatus = async () => {
      try {
        const accessToken = await getAccessToken();
        console.log(`Polling for status: ${requestId}`);
        
        const response = await fetch(`/api/financial-data/status?requestId=${requestId}`, {
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to check status: ${response.status}`);
        }
        
        const statusData = await response.json();
        console.log('Status data:', statusData);
        
        // If analysis is complete
        if (statusData.status === 'completed') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          setIsPolling(false);
          
          // Mark as processed to prevent future polling
          setHasProcessed(true);
          
          try {
            // Parse the analysis data directly from the statusData results
            const ticker = data.ticker;
            const analysisResults = JSON.parse(statusData.results);
            
            if (!analysisResults[ticker] || !analysisResults[ticker].report) {
              throw new Error('Invalid data structure');
            }
            
            // Get the report data
            const report = analysisResults[ticker].report;
            
            // Update the display data
            setData(report);
            
            // Create a concise summary for the message
            const summaryMessage = createSummaryMessage(ticker, report);
            
            // Append the message if append function is available
            if (append) {
              await append({
                role: 'assistant',
                content: summaryMessage
              });
            }
          } catch (error) {
            console.error('Error handling completed analysis:', error);
          }
        }
      } catch (error) {
        console.error('Error polling for status:', error);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setIsPolling(false);
      }
    };
    
    // Call once immediately
    pollStatus();
    
    // Then set up the interval
    intervalRef.current = setInterval(pollStatus, 3000);
    
    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [requestId, hasProcessed, getAccessToken, append, data?.ticker]);
  
  // Function to create a summary message
  const createSummaryMessage = (ticker: string, report: any): string => {
    let message = `# ${ticker} Analysis Summary\n\n`;
    
    // Company overview
    message += `## Company Overview\n`;
    message += `- **Name**: ${report.name || ticker}\n`;
    message += `- **Industry**: ${report.industry || 'N/A'}\n`;
    message += `- **Current Price**: $${report.current_price?.toFixed(2) || 'N/A'}\n`;
    message += `- **Market Cap**: $${formatMarketCap(report.market_cap)}\n`;
    message += `- **P/E Ratio**: ${report.pe_ratio?.toFixed(2) || 'N/A'}\n\n`;
    
    // Financial health
    if (report.financial_health) {
      message += `## Financial Health\n`;
      const fin = report.financial_health;
      message += `- **Gross Margin**: ${fin.gross_margin ? (fin.gross_margin * 100).toFixed(2) + '%' : 'N/A'}\n`;
      message += `- **Net Margin**: ${fin.net_margin ? (fin.net_margin * 100).toFixed(2) + '%' : 'N/A'}\n`;
      message += `- **Debt/Equity**: ${fin.debt_to_equity?.toFixed(2) || 'N/A'}\n`;
      message += `- **Current Ratio**: ${fin.current_ratio?.toFixed(2) || 'N/A'}\n\n`;
    }
    
    // Analyst consensus
    if (report.analyst_consensus) {
      const consensus = report.analyst_consensus;
      message += `## Analyst Consensus\n`;
      message += `- **Target Price**: $${consensus.avg_price_target?.toFixed(2) || 'N/A'}\n`;
      message += `- **Upside Potential**: ${consensus.upside_potential?.toFixed(2) || 'N/A'}%\n`;
      message += `- **Buy/Hold/Sell**: ${consensus.buy_count || 0}/${consensus.hold_count || 0}/${consensus.sell_count || 0}\n\n`;
    }
    
    // News sentiment with links
    if (report.news_sentiment) {
      const sentiment = report.news_sentiment;
      message += `## News Sentiment\n`;
      message += `- **Overall Sentiment**: ${sentiment.sentiment || 'Neutral'}\n`;
      message += `- **Average Score**: ${sentiment.average_score?.toFixed(2) || 'N/A'}\n`;
      message += `- **Articles Analyzed**: ${sentiment.article_count || 0}\n\n`;
      
      // Include news headlines with links if available
      if (sentiment.articles && sentiment.articles.length > 0) {
        message += `### Recent News:\n`;
        sentiment.articles.slice(0, 3).forEach((article: any, index: number) => {
          const date = article.date ? new Date(article.date).toLocaleDateString() : 'N/A';
          // Include a clickable link if available
          if (article.link) {
            message += `${index + 1}. [${article.title}](${article.link}) - ${article.publisher || 'Unknown Source'} (${date})\n`;
          } else {
            message += `${index + 1}. ${article.title} - ${article.publisher || 'Unknown Source'} (${date})\n`;
          }
        });
        message += `\n`;
      }
    }
    
    return message;
  };

  // Render loading state
  if (!data) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2">
        <div className="text-zinc-400">Loading stock analysis data...</div>
      </div>
    );
  }
  
  // Render error state
  if (data.error) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2 text-white">
        <div className="text-red-400">{data.error}</div>
      </div>
    );
  }
  
  // Render processing state
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
  
  // Render analysis data
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2 text-white">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          {data.logo_url && (
            <img 
              src={data.logo_url} 
              alt={`${data.name} logo`} 
              className="w-8 h-8 mr-2 object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          )}
          <h3 className="text-xl font-bold">{data.ticker} ({data.name || data.ticker})</h3>
        </div>
        <span className="text-2xl font-semibold">${data.current_price?.toFixed(2) || 'N/A'}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="text-sm font-semibold text-zinc-400">Market Cap</h4>
          <div className="text-lg">${formatMarketCap(data.market_cap)}</div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-zinc-400">P/E Ratio</h4>
          <div className="text-lg">{typeof data.pe_ratio === 'number' ? data.pe_ratio.toFixed(2) : 'N/A'}</div>
        </div>
        {data.analyst_consensus && (
          <>
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
          </>
        )}
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
          
          {data.news_sentiment?.articles && data.news_sentiment.articles.length > 0 && (
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              <div className="text-sm font-medium">Recent News:</div>
              {data.news_sentiment.articles.slice(0, 3).map((article: any, index: number) => (
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
      
      <div className="text-xs text-zinc-500 mt-4 text-right">
        Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  );
}