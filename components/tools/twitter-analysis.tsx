import React from 'react';
import { Activity, TrendingUp, MessageCircle, Users, Award, BarChart2 } from 'lucide-react';
import { formatNumber } from '@/utils/format';

interface TwitterMetrics {
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

interface Tweet {
  id: string;
  text: string;
  created_at: string;
  author?: {
    username: string;
    verified?: boolean;
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

interface TwitterAnalysisProps {
  metrics?: TwitterMetrics;
  tweets?: Tweet[];
  isLoading?: boolean;
}

const TwitterAnalysis: React.FC<TwitterAnalysisProps> = ({ metrics, tweets = [], isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-48 bg-zinc-800/50 rounded-lg mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-zinc-800/50 rounded-lg"></div>
          <div className="h-20 bg-zinc-800/50 rounded-lg"></div>
          <div className="h-20 bg-zinc-800/50 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-zinc-400 text-sm">
        No Twitter metrics available yet
      </div>
    );
  }

  const getLetterGrade = (score: number): { grade: string; color: string } => {
    if (score >= 90) return { grade: 'A+', color: 'text-green-400' };
    if (score >= 80) return { grade: 'A', color: 'text-green-400' };
    if (score >= 75) return { grade: 'B+', color: 'text-green-300' };
    if (score >= 70) return { grade: 'B', color: 'text-green-300' };
    if (score >= 65) return { grade: 'C+', color: 'text-yellow-400' };
    if (score >= 60) return { grade: 'C', color: 'text-yellow-400' };
    if (score >= 55) return { grade: 'D+', color: 'text-orange-400' };
    if (score >= 50) return { grade: 'D', color: 'text-orange-400' };
    return { grade: 'F', color: 'text-red-400' };
  };

  // Convert metrics to percentage scores
  const engagementScore = Math.min(100, metrics.avg_engagement_rate * 20); // Scale engagement rate
  const viralScore = Math.min(100, metrics.avg_viral_score * 10); // Scale viral score
  const discussionScore = Math.min(100, metrics.avg_discussion_ratio * 100);
  const credibilityScore = metrics.avg_credibility_score;

  // Get letter grades
  const engagementGrade = getLetterGrade(engagementScore);
  const viralGrade = getLetterGrade(viralScore);
  const discussionGrade = getLetterGrade(discussionScore);
  const credibilityGrade = getLetterGrade(credibilityScore);

  return (
    <div className="space-y-6">
      {/* Overall Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-zinc-800/40 to-zinc-900/50 hover:from-zinc-800/50 hover:to-zinc-900/60 rounded-lg p-4 shadow-lg transition-all duration-200 ease-in-out hover:shadow-xl hover:scale-[1.02] border border-zinc-700/20">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <Activity className="h-4 w-4" />
            <span className="text-sm">Engagement</span>
          </div>
          <div className={`text-2xl font-bold ${engagementGrade.color}`}>
            {engagementGrade.grade}
          </div>
          <div className="text-sm text-zinc-500">
            {engagementScore.toFixed(1)}%
          </div>
        </div>

        <div className="bg-gradient-to-br from-zinc-800/40 to-zinc-900/50 hover:from-zinc-800/50 hover:to-zinc-900/60 rounded-lg p-4 shadow-lg transition-all duration-200 ease-in-out hover:shadow-xl hover:scale-[1.02] border border-zinc-700/20">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Viral Score</span>
          </div>
          <div className={`text-2xl font-bold ${viralGrade.color}`}>
            {viralGrade.grade}
          </div>
          <div className="text-sm text-zinc-500">
            {viralScore.toFixed(1)}%
          </div>
        </div>

        <div className="bg-gradient-to-br from-zinc-800/40 to-zinc-900/50 hover:from-zinc-800/50 hover:to-zinc-900/60 rounded-lg p-4 shadow-lg transition-all duration-200 ease-in-out hover:shadow-xl hover:scale-[1.02] border border-zinc-700/20">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm">Discussion</span>
          </div>
          <div className={`text-2xl font-bold ${discussionGrade.color}`}>
            {discussionGrade.grade}
          </div>
          <div className="text-sm text-zinc-500">
            {discussionScore.toFixed(1)}%
          </div>
        </div>

        <div className="bg-gradient-to-br from-zinc-800/40 to-zinc-900/50 hover:from-zinc-800/50 hover:to-zinc-900/60 rounded-lg p-4 shadow-lg transition-all duration-200 ease-in-out hover:shadow-xl hover:scale-[1.02] border border-zinc-700/20">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <Award className="h-4 w-4" />
            <span className="text-sm">Credibility</span>
          </div>
          <div className={`text-2xl font-bold ${credibilityGrade.color}`}>
            {credibilityGrade.grade}
          </div>
          <div className="text-sm text-zinc-500">
            {credibilityScore.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Sentiment Indicators */}
      <div className="bg-gradient-to-br from-zinc-800/40 to-zinc-900/50 hover:from-zinc-800/50 hover:to-zinc-900/60 rounded-lg p-6 shadow-lg transition-all duration-200 ease-in-out hover:shadow-xl border border-zinc-700/20">
        <h3 className="text-sm font-medium text-zinc-400 mb-4">Overall Sentiment</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900/30 rounded-lg p-3 hover:bg-zinc-900/40 transition-colors duration-200">
            <div className="text-sm text-zinc-500 mb-1">Community Activity</div>
            <div className={`text-lg font-medium ${metrics.sentiment_indicators.buzz_level === 'high' ? 'text-green-400' : metrics.sentiment_indicators.buzz_level === 'medium' ? 'text-yellow-400' : 'text-red-400'}`}>
              {metrics.sentiment_indicators.buzz_level === 'high' ? '🔥 Very Active' : metrics.sentiment_indicators.buzz_level === 'medium' ? '👥 Moderate' : '💤 Quiet'}
            </div>
          </div>
          <div className="bg-zinc-900/30 rounded-lg p-3 hover:bg-zinc-900/40 transition-colors duration-200">
            <div className="text-sm text-zinc-500 mb-1">Growth Potential</div>
            <div className={`text-lg font-medium ${metrics.sentiment_indicators.viral_potential === 'high' ? 'text-green-400' : 'text-zinc-400'}`}>
              {metrics.sentiment_indicators.viral_potential === 'high' ? '📈 Strong' : '➡️ Stable'}
            </div>
          </div>
          <div className="bg-zinc-900/30 rounded-lg p-3 hover:bg-zinc-900/40 transition-colors duration-200">
            <div className="text-sm text-zinc-500 mb-1">Community Engagement</div>
            <div className={`text-lg font-medium ${metrics.sentiment_indicators.discussion_intensity === 'high' ? 'text-green-400' : metrics.sentiment_indicators.discussion_intensity === 'medium' ? 'text-yellow-400' : 'text-zinc-400'}`}>
              {metrics.sentiment_indicators.discussion_intensity === 'high' ? '💬 Very Engaged' : metrics.sentiment_indicators.discussion_intensity === 'medium' ? '👥 Active' : '🤫 Passive'}
            </div>
          </div>
        </div>
      </div>

      {/* Top Tweets */}
      {tweets.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-4">Most Impactful Tweets</h3>
          <div className="space-y-4">
            {tweets
              .sort((a, b) => b.investor_metrics.total_engagement - a.investor_metrics.total_engagement)
              .slice(0, 3)
              .map((tweet) => {
                const tweetViralGrade = getLetterGrade(tweet.investor_metrics.viral_score * 10);
                const tweetCredGrade = getLetterGrade(tweet.investor_metrics.credibility_score);
                
                return (
                  <div key={tweet.id} className="bg-gradient-to-br from-zinc-800/40 to-zinc-900/50 hover:from-zinc-800/50 hover:to-zinc-900/60 rounded-lg p-4 shadow-lg transition-all duration-200 ease-in-out hover:shadow-xl border border-zinc-700/20">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm text-zinc-400">
                        @{tweet.author?.username}
                        {tweet.author?.verified && (
                          <span className="ml-1 text-blue-400">✓</span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {new Date(tweet.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-sm mb-3">{tweet.text}</div>
                    <div className="flex gap-4 text-xs">
                      <div className="text-zinc-400">
                        👥 {formatNumber(tweet.investor_metrics.total_engagement)} engaged
                      </div>
                      <div className={tweetViralGrade.color}>
                        Viral: {tweetViralGrade.grade}
                      </div>
                      <div className={tweetCredGrade.color}>
                        Trust: {tweetCredGrade.grade}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TwitterAnalysis; 