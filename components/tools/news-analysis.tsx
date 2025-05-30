// components/tools/NewsAnalysis.tsx
import React from 'react';
import { NewsAnalysisProps } from '@/types/news';

const NewsAnalysis: React.FC<NewsAnalysisProps> = ({ toolCallId, toolInvocation }) => {
  // Get data directly from props without state
  const data = toolInvocation?.result || null;
  
  // Simple null check and early return
  if (!data) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2">
        <div className="text-zinc-400">Loading news analysis data...</div>
      </div>
    );
  }

  // Type guard to ensure we have the success response type
  if ('sentiment' in data) {
    // At this point TypeScript knows data has the success type shape
    const ticker = data.ticker || toolInvocation?.args?.ticker || "Unknown";
    const articles = data.processed_news || [];
    const sentiment = data.news_sentiment?.sentiment || 'Neutral';
    const averageScore = data.news_sentiment?.average_score?.toFixed(2) || 'N/A';
    
    // Use a static timestamp string to avoid Date object creation which can cause re-renders
    const timestamp = "Recently";
    
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2 text-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{ticker} News Analysis</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            sentiment === 'Positive' ? 'bg-green-800 text-green-100' :
            sentiment === 'Negative' ? 'bg-red-800 text-red-100' :
            'bg-zinc-700 text-zinc-300'
          }`}>
            {sentiment} Sentiment
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
                  {article.published_timestamp ? "Recent" : "Unknown date"} • {article.publisher || 'Unknown source'}
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
          <div className="text-sm">Average Sentiment: {averageScore}</div>
          <div className="text-sm">Based on {articles.length} recent articles</div>
        </div>
        
        <div className="text-xs text-zinc-500 mt-4 text-right">
          Last updated: {timestamp}
        </div>
      </div>
    );
  }
  
  // Error check
  if ('error' in data) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2 text-white">
        <div className="text-red-400">{data.error}</div>
      </div>
    );
  }
  
  // Processing check - no state required
  if (data.status === 'processing') {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2 text-white">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
          <div className="text-indigo-400">
            {data.message || "Analyzing news..."}
          </div>
        </div>
        {toolInvocation?.args?.ticker && (
          <div className="text-zinc-400 text-sm mt-2">Stock symbol: {toolInvocation.args.ticker}</div>
        )}
      </div>
    );
  }

  // If we get here, we have an invalid response format
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2 text-white">
      <div className="text-red-400">Invalid response format</div>
    </div>
  );
}

export default NewsAnalysis;