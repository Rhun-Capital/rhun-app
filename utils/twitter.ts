import { TwitterData, Tweet, TwitterMetrics } from '@/types/tools';

interface TwitterAPIResponse {
  data: Array<{
    id: string;
    text: string;
    created_at: string;
    public_metrics: {
      retweet_count: number;
      reply_count: number;
      like_count: number;
      quote_count: number;
    };
    author_id: string;
  }>;
  includes: {
    users: Array<{
      id: string;
      username: string;
      verified: boolean;
      public_metrics: {
        followers_count: number;
        following_count: number;
        tweet_count: number;
        listed_count: number;
      };
    }>;
  };
}

function calculateTweetMetrics(tweet: any, author: any): Tweet['investor_metrics'] {
  const { public_metrics } = tweet;
  const totalEngagement = 
    public_metrics.retweet_count + 
    public_metrics.reply_count + 
    public_metrics.like_count + 
    public_metrics.quote_count;

  const authorFollowers = author?.public_metrics?.followers_count || 1;
  const engagementRate = (totalEngagement / authorFollowers) * 100;
  
  // Calculate viral score based on retweets and quotes
  const viralScore = ((public_metrics.retweet_count * 2 + public_metrics.quote_count) / totalEngagement) * 100;
  
  // Calculate discussion ratio based on replies vs total engagement
  const discussionRatio = (public_metrics.reply_count / totalEngagement) * 100;
  
  // Calculate influence weight based on author metrics
  const influenceWeight = author ? Math.log10(
    (author.public_metrics.followers_count || 1) * 
    (author.public_metrics.listed_count || 1)
  ) : 0;
  
  // Calculate credibility score
  const credibilityScore = author?.verified ? 100 : 
    Math.min(100, (influenceWeight / 5) * 100);

  return {
    engagement_rate: Number(engagementRate.toFixed(2)),
    viral_score: Number(viralScore.toFixed(2)),
    discussion_ratio: Number(discussionRatio.toFixed(2)),
    influence_weight: Number(influenceWeight.toFixed(2)),
    credibility_score: Number(credibilityScore.toFixed(2)),
    total_engagement: totalEngagement
  };
}

export function calculateInvestorMetrics(response: TwitterAPIResponse): TwitterData {
  if (!response.data || !response.includes?.users) {
    throw new Error('Invalid Twitter API response format');
  }

  const tweets: Tweet[] = response.data.map(tweet => {
    const author = response.includes.users.find(user => user.id === tweet.author_id);
    const metrics = calculateTweetMetrics(tweet, author);

    return {
      id: tweet.id,
      text: tweet.text,
      created_at: tweet.created_at,
      author: author ? {
        username: author.username,
        verified: author.verified
      } : undefined,
      investor_metrics: metrics
    };
  });

  // Calculate aggregate metrics
  const totalTweets = tweets.length;
  const metrics = tweets.reduce((acc, tweet) => {
    const m = tweet.investor_metrics;
    return {
      total_engagement: acc.total_engagement + m.total_engagement,
      engagement_rates: [...acc.engagement_rates, m.engagement_rate],
      viral_scores: [...acc.viral_scores, m.viral_score],
      discussion_ratios: [...acc.discussion_ratios, m.discussion_ratio],
      credibility_scores: [...acc.credibility_scores, m.credibility_score]
    };
  }, {
    total_engagement: 0,
    engagement_rates: [] as number[],
    viral_scores: [] as number[],
    discussion_ratios: [] as number[],
    credibility_scores: [] as number[]
  });

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const count = (arr: number[], threshold: number) => arr.filter(v => v >= threshold).length;

  const aggregateMetrics: TwitterMetrics = {
    total_tweets: totalTweets,
    total_engagement: metrics.total_engagement,
    avg_engagement_rate: Number(avg(metrics.engagement_rates).toFixed(2)),
    avg_viral_score: Number(avg(metrics.viral_scores).toFixed(2)),
    avg_discussion_ratio: Number(avg(metrics.discussion_ratios).toFixed(2)),
    avg_credibility_score: Number(avg(metrics.credibility_scores).toFixed(2)),
    high_engagement_count: count(metrics.engagement_rates, 5), // >5% engagement rate
    viral_tweets_count: count(metrics.viral_scores, 50), // >50% viral score
    high_discussion_count: count(metrics.discussion_ratios, 30), // >30% discussion ratio
    sentiment_indicators: {
      buzz_level: metrics.total_engagement > 1000 ? 'high' : 
                 metrics.total_engagement > 500 ? 'medium' : 'low',
      viral_potential: avg(metrics.viral_scores) > 40 ? 'high' : 'low',
      discussion_intensity: avg(metrics.discussion_ratios) > 25 ? 'high' : 'medium'
    }
  };

  return {
    data: tweets,
    aggregate_metrics: aggregateMetrics
  };
} 