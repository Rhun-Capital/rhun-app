export interface TwitterMetrics {
  like_count: number;
  retweet_count: number;
  reply_count: number;
  quote_count: number;
}

export interface TwitterUser {
  id: string;
  username: string;
  verified: boolean;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
}

export interface Tweet {
  id: string;
  text: string;
  created_at: string;
  public_metrics: TwitterMetrics;
  author_id: string;
}

export interface TwitterAPIResponse {
  data: Tweet[];
  includes: {
    users: TwitterUser[];
  };
}

export interface ProcessedTweet extends Tweet {
  author?: {
    username: string;
    verified?: boolean;
    public_metrics?: {
      followers_count: number;
      following_count: number;
      tweet_count: number;
      listed_count: number;
    };
  };
  investor_metrics: {
    engagement_rate: number;
    viral_score: number;
    discussion_ratio: number;
    influence_weight: number;
    credibility_score: number;
    total_engagement: number;
  };
}

export interface TwitterMetrics {
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
}

export interface TwitterData {
  data: ProcessedTweet[];
  aggregate_metrics: TwitterMetrics;
} 