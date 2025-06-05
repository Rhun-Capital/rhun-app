import { NextResponse } from 'next/server';
import { calculateInvestorMetrics } from '@/utils/investorMetrics';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');
  const includeReplies = searchParams.get('includeReplies') === 'true';
  const minEngagement = searchParams.get('minEngagement') || '5';
  
  if (!ticker) {
    return NextResponse.json({ error: 'Ticker required' }, { status: 400 });
  }
  
  // Build optimized query for investors
  let query = `$${ticker} -is:retweet lang:en min_faves:${minEngagement}`;
  if (!includeReplies) {
    query += ' -is:reply';
  }
  
  const encodedQuery = encodeURIComponent(query);
  
  // Enhanced fields for investor analysis
  const tweetFields = [
    'created_at',
    'author_id', 
    'public_metrics',
    'context_annotations',
    'lang',
    'referenced_tweets',
    'conversation_id',
    'possibly_sensitive'
  ].join(',');
  
  const userFields = [
    'public_metrics',
    'verified',
    'created_at',
    'description',
    'name',
    'username'
  ].join(',');
  
  const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodedQuery}&max_results=100&tweet.fields=${tweetFields}&user.fields=${userFields}&expansions=author_id`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ 
        error: 'Twitter API error',
        details: errorData 
      }, { status: response.status });
    }
    
    const data = await response.json();
    
    // Process and enhance the data with investor metrics
    const enhancedData = calculateInvestorMetrics(data);
    
    return NextResponse.json(enhancedData);
  } catch (error: any) {
    console.error('Twitter API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch tweets',
      message: error.message 
    }, { status: 500 });
  }
} 