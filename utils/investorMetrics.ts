interface TwitterUser {
  id: string;
  verified?: boolean;
  created_at?: string;
  username?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
}

interface Tweet {
  author_id: string;
  created_at: string;
  text: string;
  public_metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
  };
}

interface TwitterResponse {
  data: Tweet[];
  includes?: {
    users: TwitterUser[];
  };
}

interface EnhancedTweet extends Tweet {
  author?: TwitterUser;
  investor_metrics: {
    engagement_rate: number;
    viral_score: number;
    discussion_ratio: number;
    influence_weight: number;
    credibility_score: number;
    total_engagement: number;
    account_age_days: number;
  };
}

interface AggregateMetrics {
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

function calculateCredibilityScore(author: TwitterUser | undefined, accountAgeDays: number): number {
  if (!author) return 0;
  
  let score = 0;
  
  // Verified account bonus
  if (author.verified) score += 30;
  
  // Account age factor (older accounts more credible)
  if (accountAgeDays > 365) score += 25;
  else if (accountAgeDays > 180) score += 15;
  else if (accountAgeDays > 90) score += 10;
  
  // Follower count factor (logarithmic to prevent mega-influencer bias)
  const followerScore = Math.min(25, Math.log10((author.public_metrics?.followers_count || 0) + 1) * 3);
  score += followerScore;
  
  // Tweet frequency (active but not spam)
  const tweetsPerDay = (author.public_metrics?.tweet_count || 0) / Math.max(accountAgeDays, 1);
  if (tweetsPerDay > 0.5 && tweetsPerDay < 20) score += 10;
  
  // Following/follower ratio (not following too many relative to followers)
  const followRatio = (author.public_metrics?.following_count || 0) / Math.max(author.public_metrics?.followers_count || 1, 1);
  if (followRatio < 2) score += 10;
  
  return Math.min(score, 100); // Cap at 100
}

function calculateAggregateMetrics(tweets: EnhancedTweet[]): AggregateMetrics {
  if (!tweets.length) {
    return {
      total_tweets: 0,
      total_engagement: 0,
      avg_engagement_rate: 0,
      avg_viral_score: 0,
      avg_discussion_ratio: 0,
      avg_credibility_score: 0,
      high_engagement_count: 0,
      viral_tweets_count: 0,
      high_discussion_count: 0,
      sentiment_indicators: {
        buzz_level: 'low',
        viral_potential: 'low',
        discussion_intensity: 'medium'
      }
    };
  }
  
  const totalEngagement = tweets.reduce((sum, tweet) => 
    sum + tweet.investor_metrics.total_engagement, 0);
  
  const avgEngagementRate = tweets.reduce((sum, tweet) => 
    sum + tweet.investor_metrics.engagement_rate, 0) / tweets.length;
  
  const avgViralScore = tweets.reduce((sum, tweet) => 
    sum + tweet.investor_metrics.viral_score, 0) / tweets.length;
  
  const avgDiscussionRatio = tweets.reduce((sum, tweet) => 
    sum + tweet.investor_metrics.discussion_ratio, 0) / tweets.length;
  
  const avgCredibilityScore = tweets.reduce((sum, tweet) => 
    sum + tweet.investor_metrics.credibility_score, 0) / tweets.length;
  
  // Sentiment indicators
  const highEngagementTweets = tweets.filter(t => t.investor_metrics.engagement_rate > avgEngagementRate * 1.5);
  const viralTweets = tweets.filter(t => t.investor_metrics.viral_score > 0.5);
  const highDiscussionTweets = tweets.filter(t => t.investor_metrics.discussion_ratio > 0.3);
  
  return {
    total_tweets: tweets.length,
    total_engagement: totalEngagement,
    avg_engagement_rate: Number(avgEngagementRate.toFixed(6)),
    avg_viral_score: Number(avgViralScore.toFixed(3)),
    avg_discussion_ratio: Number(avgDiscussionRatio.toFixed(3)),
    avg_credibility_score: Number(avgCredibilityScore.toFixed(2)),
    high_engagement_count: highEngagementTweets.length,
    viral_tweets_count: viralTweets.length,
    high_discussion_count: highDiscussionTweets.length,
    sentiment_indicators: {
      buzz_level: totalEngagement > 1000 ? 'high' : totalEngagement > 300 ? 'medium' : 'low',
      viral_potential: viralTweets.length / tweets.length > 0.1 ? 'high' : 'low',
      discussion_intensity: highDiscussionTweets.length / tweets.length > 0.2 ? 'high' : 'medium'
    }
  };
}

export function calculateInvestorMetrics(twitterData: TwitterResponse): TwitterResponse & { data: EnhancedTweet[]; aggregate_metrics: AggregateMetrics } {
  if (!twitterData.data || !Array.isArray(twitterData.data)) {
    return {
      ...twitterData,
      data: [],
      aggregate_metrics: calculateAggregateMetrics([])
    };
  }
  
  // Create user lookup for efficiency
  const userLookup: { [key: string]: TwitterUser } = {};
  if (twitterData.includes?.users) {
    twitterData.includes.users.forEach(user => {
      userLookup[user.id] = user;
    });
  }
  
  const enhancedTweets = twitterData.data.map(tweet => {
    const author = userLookup[tweet.author_id];
    const metrics = tweet.public_metrics || {
      like_count: 0,
      retweet_count: 0,
      reply_count: 0,
      quote_count: 0
    };
    const authorMetrics = author?.public_metrics || {
      followers_count: 0,
      following_count: 0,
      tweet_count: 0
    };
    
    // Calculate investor-relevant metrics
    const totalEngagement = metrics.like_count + 
                           metrics.retweet_count + 
                           metrics.reply_count + 
                           metrics.quote_count;
    
    const engagementRate = authorMetrics.followers_count > 0 ? 
      totalEngagement / authorMetrics.followers_count : 0;
    
    const viralScore = metrics.like_count > 0 ? 
      (metrics.retweet_count || 0) / metrics.like_count : 0;
    
    const discussionRatio = totalEngagement > 0 ? 
      (metrics.reply_count || 0) / totalEngagement : 0;
    
    const influenceWeight = authorMetrics.followers_count ? 
      Math.log(authorMetrics.followers_count + 1) : 0;
    
    // Account credibility score
    const accountAge = author?.created_at ? 
      (new Date().getTime() - new Date(author.created_at).getTime()) / (1000 * 60 * 60 * 24) : 0;
    
    const credibilityScore = calculateCredibilityScore(author, accountAge);
    
    return {
      ...tweet,
      author: author,
      investor_metrics: {
        engagement_rate: Number(engagementRate.toFixed(6)),
        viral_score: Number(viralScore.toFixed(3)),
        discussion_ratio: Number(discussionRatio.toFixed(3)),
        influence_weight: Number(influenceWeight.toFixed(2)),
        credibility_score: Number(credibilityScore.toFixed(2)),
        total_engagement: totalEngagement,
        account_age_days: Math.floor(accountAge)
      }
    };
  });
  
  // Calculate aggregate metrics for the entire dataset
  const aggregateMetrics = calculateAggregateMetrics(enhancedTweets);
  
  return {
    ...twitterData,
    data: enhancedTweets,
    aggregate_metrics: aggregateMetrics
  };
} 