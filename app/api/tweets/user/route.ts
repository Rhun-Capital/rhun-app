import { NextResponse } from 'next/server';
import { calculateInvestorMetrics } from '@/utils/investorMetrics';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  const maxResults = searchParams.get('maxResults') || '25';
  
  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }
  
  // Remove @ if provided
  const cleanUsername = username.replace('@', '');
  
  const tweetFields = [
    'created_at',
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
    'name'
  ].join(',');
  
  const url = `https://api.twitter.com/2/users/by/username/${cleanUsername}/tweets?max_results=${maxResults}&tweet.fields=${tweetFields}&user.fields=${userFields}&expansions=author_id`;
  
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
      error: 'Failed to fetch user tweets',
      message: error.message 
    }, { status: 500 });
  }
} 