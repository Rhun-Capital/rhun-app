import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '10');
    
    const blockTimes = searchParams.getAll('block_time[]');
    const activityTypes = searchParams.getAll('activity_type[]');
    const from = searchParams.get('from');
    const platforms = searchParams.getAll('platform[]').slice(0, 5);
    const sources = searchParams.getAll('source[]').slice(0, 5);
    const token = searchParams.get('token');

    if (!address) {
      return NextResponse.json(
        { error: 'Account address is required' },
        { status: 400 }
      );
    }

    const solscanParams = new URLSearchParams();
    solscanParams.append('address', address);
    solscanParams.append('page', page.toString());
    solscanParams.append('page_size', pageSize.toString());

    if (blockTimes.length === 2) {
      solscanParams.append('block_time[]', blockTimes[0]);
      solscanParams.append('block_time[]', blockTimes[1]);
    }

    activityTypes.forEach(type => {
      solscanParams.append('activity_type[]', type);
    });

    if (from) solscanParams.append('from', from);
    platforms.forEach(p => solscanParams.append('platform[]', p));
    sources.forEach(s => solscanParams.append('source[]', s));
    if (token) solscanParams.append('token', token);

    const response = await fetch(
      `https://pro-api.solscan.io/v2.0/account/defi/activities?${solscanParams.toString()}`,
      {
        headers: {
          'token': process.env.SOLSCAN_API_KEY || '',
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) throw new Error('Failed to fetch from Solscan API');

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