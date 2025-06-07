import React from 'react';
import LoadingIndicator from '@/components/loading-indicator';
import { Heart, MessageCircle, Repeat } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface TwitterPublicMetrics {
  retweet_count: number;
  reply_count: number;
  like_count: number;
  quote_count: number;
  bookmark_count?: number;
  impression_count?: number;
}

interface TwitterAuthor {
  name?: string;
  username: string;
  verified?: boolean;
  profile_image_url?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count?: number;
    like_count?: number;
    media_count?: number;
  };
  description?: string;
  created_at?: string;
  id?: string;
}

interface Tweet {
  id: string;
  text: string;
  created_at: string;
  public_metrics?: TwitterPublicMetrics;
  author?: TwitterAuthor;
  investor_metrics: {
    engagement_rate: number;
    viral_score: number;
    discussion_ratio: number;
    influence_weight: number;
    credibility_score: number;
    total_engagement: number;
  };
}

interface TwitterResult {
  success: boolean;
  data: Tweet[];
  aggregate_metrics?: {
    total_tweets: number;
    total_engagement: number;
    avg_engagement_rate: number;
    avg_viral_score: number;
    avg_discussion_ratio: number;
    avg_credibility_score: number;
    high_engagement_count: number;
    viral_tweets_count: number;
    high_discussion_count: number;
    sentiment_indicators: {
      buzz_level: 'high' | 'medium' | 'low';
      viral_potential: 'high' | 'low';
      discussion_intensity: 'high' | 'medium';
    };
  };
}

interface RecentTweetsProps {
  toolCallId: string;
  toolInvocation: {
    args: {
      ticker: string;
    };
    result?: {
      result: TwitterResult;
    };
    state: 'call' | 'partial-call' | 'result';
  };
}

const RecentTweets: React.FC<RecentTweetsProps> = ({ toolCallId, toolInvocation }) => {
  const result = toolInvocation.result?.result;
  const isLoading = toolInvocation.state === 'call' || toolInvocation.state === 'partial-call';
  const ticker = toolInvocation.args.ticker;

  if (isLoading) {
    return (
      <div className="p-4 text-center text-zinc-400">
        <LoadingIndicator />
      </div>
    );
  }

  if (!result || !result.success) {
    return (
      <div className="text-zinc-400 p-4">
        No tweets found for {ticker}
      </div>
    );
  }

  if (!result.data || result.data.length === 0) {
    return (
      <div className="text-zinc-400 p-4">
        No recent tweets found for {ticker}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {result.data.map((tweet: Tweet) => (
          <Link
            key={tweet.id}
            href={`https://twitter.com/${tweet.author?.username || 'twitter'}/status/${tweet.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <div className="bg-zinc-900/80 rounded-xl p-4 space-y-3 border border-zinc-800/50 transition-all duration-200 hover:bg-zinc-800/90 hover:scale-[1.01] hover:border-zinc-700/50">
              {/* Author info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {tweet.author?.profile_image_url ? (
                    <Image
                      src={tweet.author.profile_image_url}
                      alt={tweet.author.name || tweet.author.username}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400">
                      <span className="text-lg">{(tweet.author?.name || tweet.author?.username || '?')[0]}</span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-white">
                        {tweet.author?.name || tweet.author?.username || 'Unknown User'}
                      </span>
                      {tweet.author?.verified && (
                        <span className="text-blue-400">
                          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                            <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-zinc-500">@{tweet.author?.username || 'unknown'}</div>
                  </div>
                </div>
                <span className="text-sm text-zinc-500">
                  {new Date(tweet.created_at).toLocaleDateString()}
                </span>
              </div>
              
              {/* Tweet content */}
              <div className="text-[15px] text-zinc-100 leading-normal">
                {tweet.text}
              </div>
              
              {/* Engagement metrics */}
              <div className="flex items-center gap-6 pt-1">
                <div className="flex items-center gap-2 text-zinc-500">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">
                    {tweet.public_metrics?.reply_count || tweet.investor_metrics.total_engagement > 0 ? 
                      (tweet.public_metrics?.reply_count || tweet.investor_metrics.total_engagement).toLocaleString() : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-zinc-500">
                  <Repeat className="w-4 h-4" />
                  <span className="text-sm">
                    {tweet.public_metrics?.retweet_count && tweet.public_metrics.retweet_count > 0 ? 
                      tweet.public_metrics.retweet_count.toLocaleString() : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-zinc-500">
                  <Heart className="w-4 h-4" />
                  <span className="text-sm">
                    {tweet.public_metrics?.like_count && tweet.public_metrics.like_count > 0 ? 
                      tweet.public_metrics.like_count.toLocaleString() : ''}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RecentTweets; 