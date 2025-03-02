import React, { useState, useRef, useEffect } from 'react';
// Import from Vercel AI SDK
import type { ToolInvocation as AIToolInvocation } from '@ai-sdk/ui-utils';
import LoadingIndicator from '../loading-indicator';

// News article interface based on our retrieval function
interface CryptoNewsArticle {
  id: string;
  title: string;
  summary: string;
  full_text: string;
  url: string;
  published_date: string;
  source: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  categories: string[];
  image_url?: string;
  score: number;
}

interface CryptoNewsProps {
  toolCallId: string;
  toolInvocation: AIToolInvocation & {
    result?: CryptoNewsArticle[];
  };
}

// Helper function to format time ago
const formatTimeAgo = (dateString: string): string => {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

// Safe array access helper
const safeArrayAccess = <T,>(arr: T[] | undefined | null): T[] => {
  return Array.isArray(arr) ? arr : [];
};

// Get color for sentiment badge
const getSentimentColor = (sentiment: string): string => {
  switch (sentiment) {
    case 'POSITIVE':
      return 'bg-green-900 text-green-200';
    case 'NEGATIVE':
      return 'bg-red-900 text-red-200';
    default:
      return 'bg-blue-900 text-blue-200';
  }
};

const CryptoNewsComponent: React.FC<CryptoNewsProps> = ({ toolInvocation }) => {
  const [selectedArticle, setSelectedArticle] = useState<CryptoNewsArticle | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  
  // Safely get the articles array
  const articles = Array.isArray(toolInvocation.result) ? toolInvocation.result : [];

  useEffect(() => {
    if (selectedArticle && topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedArticle, topRef]);

  // If loading show loading state
  if (!articles.length && (toolInvocation.state === 'call' || toolInvocation.state === 'partial-call')) {
    return (
      <div className="p-4 text-center text-zinc-400">
        <LoadingIndicator/>
      </div>
    );
  }  

  // If no articles, show empty state
  if (!articles.length && toolInvocation.state === 'result') {
    return (
      <div className="p-4 text-center text-zinc-400">
        No news articles found
      </div>
    );
  }

  // Article detail view
  if (selectedArticle) {
    // Ensure we have a valid article (defensive coding)
    if (!selectedArticle.id) {
      return (
        <div className="p-4 text-center text-zinc-400">
          Invalid article data
        </div>
      );
    }

    return (
      <div className="bg-zinc-800 p-4 rounded-lg" ref={topRef}>
        <button 
          onClick={() => setSelectedArticle(null)}
          className="mb-4 text-sm text-zinc-400 hover:text-white"
        >
          ← Back to list
        </button>

        <div className="mb-4">
          {selectedArticle.image_url && (
            <img 
              src={selectedArticle.image_url || '/api/placeholder/800/400'}
              alt={selectedArticle.title}
              className="w-full h-48 object-cover rounded-lg mb-4"
            />
          )}
          
          <h2 className="text-xl font-bold text-white mb-2">
            {selectedArticle.title}
          </h2>
          
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`px-2 py-0.5 text-xs rounded ${getSentimentColor(selectedArticle.sentiment)}`}>
              {selectedArticle.sentiment}
            </span>
            
            <span className="bg-zinc-700 text-zinc-300 px-2 py-0.5 text-xs rounded">
              {selectedArticle.source}
            </span>
            
            <span className="bg-zinc-700 text-zinc-300 px-2 py-0.5 text-xs rounded">
              {formatTimeAgo(selectedArticle.published_date)}
            </span>
            
            {safeArrayAccess(selectedArticle.categories).map(category => (
              <span key={category} className="bg-purple-900 text-purple-200 px-2 py-0.5 text-xs rounded">
                {category}
              </span>
            ))}
          </div>
        </div>

        {/* Article content */}
        <div className="bg-zinc-900 p-4 rounded-lg mb-4">
          <p className="text-zinc-300 whitespace-pre-line">
            {selectedArticle.full_text}
          </p>
        </div>

        {/* Article metadata */}
        <div className="space-y-3">
          {/* Source and publication info */}
          <div className="bg-zinc-900 p-3 rounded-lg">
            <div className="text-sm text-zinc-500 mb-2">Publication Details</div>
            <div className="text-sm text-zinc-300">
              <div><span className="text-zinc-400">Source:</span> {selectedArticle.source}</div>
              <div><span className="text-zinc-400">Published:</span> {new Date(selectedArticle.published_date).toLocaleString()}</div>
              <div><span className="text-zinc-400">Sentiment:</span> {selectedArticle.sentiment}</div>
            </div>
          </div>

          {/* Categories */}
          {safeArrayAccess(selectedArticle.categories).length > 0 && (
            <div className="bg-zinc-900 p-3 rounded-lg">
              <div className="text-sm text-zinc-500 mb-2">Categories</div>
              <div className="flex flex-wrap gap-2">
                {safeArrayAccess(selectedArticle.categories).map(category => (
                  <span key={category} className="bg-zinc-700 text-zinc-300 px-2 py-1 text-xs rounded">
                    {category}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Original link */}
          {selectedArticle.url && (
            <div className="bg-zinc-900 p-3 rounded-lg">
              <a 
                href={selectedArticle.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 flex items-center justify-center py-2"
              >
                Read Article
              </a>
            </div>
          )}

        </div>
      </div>
    );
  }

  // Article list view
  return (
    <div className="bg-zinc-800 rounded-lg">
      <div className="p-4">
        <h2 className="text-xl font-bold text-white mb-2">Crypto News</h2>
        <p className="text-zinc-400 mb-4">Latest cryptocurrency news and updates</p>

        <div className="space-y-3">
          {articles.map((article: CryptoNewsArticle) => {
            // Skip articles without required fields
            if (!article || !article.id) return null;
            
            return (
              <div 
                key={article.id}
                onClick={() => setSelectedArticle(article)}
                className="bg-zinc-900 p-3 rounded-lg flex items-start hover:bg-zinc-700 cursor-pointer transition-colors"
              >
                {article.image_url ? (
                  <img 
                    src={article.image_url}
                    alt={article.title}
                    className="w-16 h-16 object-cover rounded mr-3 flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 bg-zinc-700 rounded mr-3 flex items-center justify-center flex-shrink-0">
                    <span className="text-zinc-500 text-xs">No image</span>
                  </div>
                )}
                
                <div className="flex-grow">
                  <div className="font-medium text-white">
                    {article.title}
                  </div>
                  <div className="text-sm text-zinc-400 mt-1 line-clamp-2">
                    {article.summary}
                  </div>
                  <div className="flex flex-wrap gap-x-2 mt-2 text-xs">
                    <span className="text-zinc-500">{article.source}</span>
                    <span className="text-zinc-500">{formatTimeAgo(article.published_date)}</span>
                    
                    <span className={`px-1.5 py-0.5 rounded-sm ${getSentimentColor(article.sentiment)}`}>
                      {article.sentiment}
                    </span>
                    
                    {article.categories && article.categories.length > 0 && (
                      <span className="bg-purple-900 text-purple-200 px-1.5 py-0.5 rounded-sm">
                        {article.categories[0]}
                      </span>
                    )}
                  </div>
                </div>
                
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CryptoNewsComponent;