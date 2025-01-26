import { NextResponse, NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const paramConfig = {
      address: params.get('address'),
      page: parseInt(params.get('page') || '1'),
      pageSize: parseInt(params.get('page_size') || '10'),
      blockTimes: params.getAll('block_time[]'),
      activityTypes: params.getAll('activity_type[]'),
      from: params.get('from'),
      platforms: params.getAll('platform[]').slice(0, 5),
      sources: params.getAll('source[]').slice(0, 5),
      token: params.get('token')
    };

    if (!paramConfig.address) {
      return NextResponse.json(
        { error: 'Account address is required' },
        { status: 400 }
      );
    }

    const apiParams = new URLSearchParams();
    apiParams.append('address', paramConfig.address);
    apiParams.append('page', paramConfig.page.toString());
    apiParams.append('page_size', paramConfig.pageSize.toString());

    if (paramConfig.blockTimes.length === 2) {
      paramConfig.blockTimes.forEach(time => {
        apiParams.append('block_time[]', time);
      });
    }

    paramConfig.activityTypes.forEach(type => {
      apiParams.append('activity_type[]', type);
    });

    if (paramConfig.from) apiParams.append('from', paramConfig.from);
    paramConfig.platforms.forEach(p => apiParams.append('platform[]', p));
    paramConfig.sources.forEach(s => apiParams.append('source[]', s));
    if (paramConfig.token) apiParams.append('token', paramConfig.token);

    const response = await fetch(
      `https://pro-api.solscan.io/v2.0/account/defi/activities?${apiParams.toString()}`,
      {
        headers: {
          'token': process.env.SOLSCAN_API_KEY || '',
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Solscan API error: ${response.status}`);
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