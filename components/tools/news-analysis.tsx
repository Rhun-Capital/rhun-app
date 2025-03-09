// components/tools/NewsAnalysis.tsx
import React, { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface NewsAnalysisProps {
  toolCallId: string;
  toolInvocation: any;
}

export default function NewsAnalysis({ toolCallId, toolInvocation }: NewsAnalysisProps) {
  // Directly use toolInvocation.result as the initial state
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
            try {
              // Parse the results JSON if it's a string
              const parsedResults = typeof statusData.results === 'string' 
                ? JSON.parse(statusData.results)
                : statusData.results;
              
              // Access the news data
              const newsData = parsedResults[data.ticker]?.news_data;
              
              if (newsData) {
                setData(newsData);
              } else {
                console.error('News data not found for ticker:', data.ticker);
              }
            } catch (error) {
              console.error('Error parsing results:', error);
            }
            
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
      }, 10000); // Check every 10 seconds
      
      return () => clearInterval(pollInterval);
    }
  }, [data, getAccessToken]);

  if (!data) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2">
        <div className="text-zinc-400">Loading news analysis data...</div>
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
            {isPolling ? "Analyzing news..." : data.message || "Analyzing news..."}
          </div>
        </div>
        <div className="text-zinc-400 text-sm mt-2">Stock symbol: {data.ticker}</div>
      </div>
    );
  }

  // Get news articles and ensure they exist
  const articles = data.processed_news || [];

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2 text-white">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">{data.ticker || toolInvocation.args?.ticker} News Analysis</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          data.news_sentiment?.sentiment === 'Positive' ? 'bg-green-800 text-green-100' :
          data.news_sentiment?.sentiment === 'Negative' ? 'bg-red-800 text-red-100' :
          'bg-zinc-700 text-zinc-300'
        }`}>
          {data.news_sentiment?.sentiment || 'Neutral'} Sentiment
        </div>
      </div>
      
      <div className="space-y-3">
        {articles.length > 0 ? (
          articles.slice(0, 5).map((article: any, index: number) => (
            <div key={index} className="border border-zinc-700 rounded-lg p-3">
              <div className="flex justify-between">
                <h4 className="font-medium">{article.title || 'No Title'}</h4>
                <span className={`text-xs px-2 py-1 rounded max-h-6 ${
                  article.sentiment?.score > 0.3 ? 'bg-green-800 text-green-100' :
                  article.sentiment?.score < -0.3 ? 'bg-red-800 text-red-100' :
                  'bg-zinc-700 text-zinc-300'
                }`}>
                  {typeof article.sentiment?.score === 'number' 
                    ? article.sentiment.score.toFixed(2) 
                    : '0.00'}
                </span>
              </div>
              <div className="text-sm text-zinc-400 mt-1">
                {article.published_timestamp ? new Date(article.published_timestamp).toLocaleDateString() : 'Unknown date'} • {article.publisher || 'Unknown source'}
              </div>
              {article.summary && (
                <div className="text-sm mt-2 line-clamp-2">{article.summary}</div>
              )}
              {article.link && (
                <a 
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 inline-block"
                >
                  Read article
                </a>
              )}
            </div>
          ))
        ) : (
          <div className="text-zinc-400">No recent news articles found.</div>
        )}
        
        {articles.length > 5 && (
          <div className="text-sm text-zinc-400">+ {articles.length - 5} more articles</div>
        )}
      </div>
      
      <div className="border-t border-zinc-700 pt-3 mt-3">
        <h4 className="font-semibold mb-2">Summary</h4>
        <div className="text-sm">Average Sentiment: {typeof data.news_sentiment?.average_score === 'number' ? data.news_sentiment.average_score.toFixed(2) : 'N/A'}</div>
        <div className="text-sm">Based on {articles.length} recent articles</div>
      </div>
      
      {/* Last update timestamp */}
      <div className="text-xs text-zinc-500 mt-4 text-right">
        Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  );
}