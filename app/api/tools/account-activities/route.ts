import { sortBy } from 'lodash';
import { NextResponse, NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const paramConfig = {
      address: params.get('address'),
      page: parseInt(params.get('page') || '1'),
      pageSize: parseInt(params.get('page_size') || '10'),
      sortBy: params.get('sort_by'),
      sortOrder: params.get('sort_order'),
      blockTimes: params.getAll('block_time[]'),
      activityTypes: params.getAll('activity_type[]'),
      from: params.get('from'),
      platforms: params.getAll('platform[]').slice(0, 5),
      sources: params.getAll('source[]').slice(0, 5),
      token: params.get('token')
    };

    console.log('Received request with params:', paramConfig);

    if (!paramConfig.address) {
      console.error('Missing required address parameter');
      return NextResponse.json(
        { error: 'Account address is required' },
        { status: 400 }
      );
    }

    const apiParams = new URLSearchParams();
    apiParams.append('address', paramConfig.address);
    apiParams.append('page', paramConfig.page.toString());
    apiParams.append('page_size', paramConfig.pageSize.toString());
    apiParams.append('sort_by', paramConfig.sortBy || 'block_time');
    apiParams.append('sort_order', paramConfig.sortOrder || 'desc');

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

    const solscanUrl = `${process.env.NEXT_PUBLIC_SOLSCAN_BASE_URL}/account/defi/activities?${apiParams.toString()}`;
    console.log('Calling Solscan API:', solscanUrl);

    const response = await fetch(solscanUrl, {
      headers: {
        'token': process.env.SOLSCAN_API_KEY || '',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Solscan API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: solscanUrl
      });
      
      if (response.status === 404) {
        return NextResponse.json({ data: [], metadata: { tokens: {} } });
      }
      
      return NextResponse.json(
        { error: `Failed to fetch activities: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Solscan API response success:', {
      dataLength: data?.data?.length,
      hasMetadata: !!data?.metadata,
      tokenCount: Object.keys(data?.metadata?.tokens || {}).length
    });

    if (!data || !data.data) {
      console.error('Invalid response format:', data);
      return NextResponse.json(
        { error: 'Invalid response format from Solscan API' },
        { status: 500 }
      );
    }

    // Ensure we have the expected data structure
    const formattedResponse = {
      data: data.data || [],
      metadata: {
        tokens: data.metadata?.tokens || {}
      }
    };

    return NextResponse.json(formattedResponse);

  } catch (error: any) {
    console.error('Error in account activities endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch account activities' },
      { status: 500 }
    );
  }
}