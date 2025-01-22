// app/api/tools/account-activities/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    
    // Collect all query parameters
    const blockTimes = searchParams.getAll('block_time[]');
    const activityTypes = searchParams.getAll('activity_type[]');
    const from = searchParams.get('from');
    const platforms = searchParams.getAll('platform[]').slice(0, 5); // Limit to 5
    const sources = searchParams.getAll('source[]').slice(0, 5); // Limit to 5
    const token = searchParams.get('token');

    if (!address) {
      return NextResponse.json(
        { error: 'Account address is required' },
        { status: 400 }
      );
    }

    // Build query params for Solscan API
    const solscanParams = new URLSearchParams();
    solscanParams.append('address', address);
    solscanParams.append('page', '1');
    solscanParams.append('page_size', '10');

    // Add block time range if provided
    if (blockTimes.length === 2) {
      solscanParams.append('block_time[]', blockTimes[0]);
      solscanParams.append('block_time[]', blockTimes[1]);
    }

    // Add activity types if provided
    activityTypes.forEach(type => {
      solscanParams.append('activity_type[]', type);
    });

    // Add from address if provided
    if (from) {
      solscanParams.append('from', from);
    }

    // Add platform addresses if provided
    platforms.forEach(platform => {
      solscanParams.append('platform[]', platform);
    });

    // Add source addresses if provided
    sources.forEach(source => {
      solscanParams.append('source[]', source);
    });

    // Add token address if provided
    if (token) {
      solscanParams.append('token', token);
    }

    const response = await fetch(
      `https://pro-api.solscan.io/v2.0/account/defi/activities?${solscanParams.toString()}`,
      {
        headers: {
          'token': process.env.SOLSCAN_API_KEY || '',
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch from Solscan API');
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error fetching account activities:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch account activities' },
      { status: 500 }
    );
  }
}