import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { ticker } = await request.json();
    
    if (!ticker) {
      return NextResponse.json({ 
        success: false, 
        message: 'Ticker symbol is required' 
      });
    }

    // Mock data for demonstration - replace with actual Twitter API call
    const mockTweets = [
      {
        text: `Just bought some ${ticker}! Looking bullish 🚀`,
        created_at: new Date().toISOString(),
        author: {
          username: 'cryptotrader',
          verified: true
        }
      },
      {
        text: `${ticker} showing strong support at current levels. Technical analysis looks promising.`,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        author: {
          username: 'tradingexpert',
          verified: false
        }
      }
    ];

    return NextResponse.json({
      success: true,
      data: mockTweets
    });

  } catch (error) {
    console.error('Error fetching tweets:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to fetch tweets' 
    });
  }
} 