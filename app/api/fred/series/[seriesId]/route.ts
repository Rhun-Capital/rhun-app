import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { seriesId: string } }
) {
  const seriesId = params.seriesId;
  const searchParams = request.nextUrl.searchParams;
  const fullData = searchParams.get('full') === 'true';
  
  if (!seriesId) {
    return NextResponse.json(
      { error: 'Series ID is required' },
      { status: 400 }
    );
  }

  try {
    // Build URL based on whether we want full data or limited data
    let url = '';
    
    if (fullData) {
      // For full data, don't include limits but still use reasonable defaults
      url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${process.env.FRED_API_KEY}&file_type=json`;
    } else {
      // For limited data, use the last 10 years
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${process.env.FRED_API_KEY}&file_type=json&observation_start=${startDate}&observation_end=${endDate}`;
    }

    // Fetch observations data
    const obsResponse = await fetch(url);
    const obsData = await obsResponse.json();
    
    if (obsData.error) {
      return NextResponse.json(
        { error: `Failed to fetch data for "${seriesId}"` },
        { status: 400 }
      );
    }
    
    // Also fetch series metadata to get units and other info
    const seriesResponse = await fetch(`https://api.stlouisfed.org/fred/series?series_id=${seriesId}&api_key=${process.env.FRED_API_KEY}&file_type=json`);
    const seriesData = await seriesResponse.json();
    
    // Extract series metadata from the response
    const metadata = seriesData.seriess?.[0] || {};
    
    // Sort observations in ascending order for display purposes
    if (obsData.observations && Array.isArray(obsData.observations)) {
      obsData.observations = obsData.observations.sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }
    
    return NextResponse.json({
      seriesId,
      title: metadata.title || '',
      metadata: {
        id: metadata.id || seriesId,
        title: metadata.title || '',
        units: metadata.units || '',
        units_short: metadata.units_short || '',
        frequency: metadata.frequency || '',
        seasonal_adjustment: metadata.seasonal_adjustment || '',
        last_updated: metadata.last_updated || new Date().toISOString(),
        notes: metadata.notes || ''
      },
      observations: obsData.observations || [],
      count: obsData.observations?.length || 0,
      limitedData: !fullData,
      period: fullData 
        ? { full: true } 
        : {
            start: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0],
            years: 10
          }
    });
  } catch (error) {
    console.error('Error fetching FRED series:', error);
    return NextResponse.json(
      { error: `Failed to fetch FRED series data for "${seriesId}"` },
      { status: 500 }
    );
  }
} 