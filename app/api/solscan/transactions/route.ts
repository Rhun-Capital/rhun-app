// app/api/solscan/transactions/route.ts

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Extract query parameters from the request URL
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const limit = searchParams.get('limit') || '10';

  // Validate that the address is provided
  if (!address) {
    return NextResponse.json(
      { error: 'The "address" query parameter is required.' },
      { status: 400 }
    );
  }

  // Get the Solscan API token from environment variables
  const SOLSCAN_API_TOKEN = process.env.SOLSCAN_API_KEY;
  if (!SOLSCAN_API_TOKEN) {
    return NextResponse.json(
      { error: 'Server configuration error: API token is missing.' },
      { status: 500 }
    );
  }

  // Construct the Solscan API URL
  const solscanUrl = `https://pro-api.solscan.io/v2.0/account/transactions?address=${address}&limit=${limit}`;

  try {
    // Call the Solscan API endpoint
    const response = await fetch(solscanUrl, {
      headers: {
        'Content-Type': 'application/json',
        token: SOLSCAN_API_TOKEN,
      },
    });

    // If the response is not OK, return an error message
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Solscan API responded with ${response.status}: ${errorText}` },
        { status: response.status }
      );
    }

    // Parse the JSON response from Solscan
    const data = await response.json();

    // Return the JSON data to the client
    return NextResponse.json(data);
  } catch (error: any) {
    // Handle any errors that occurred during the fetch
    return NextResponse.json(
      { error: error.message || 'Unexpected error occurred.' },
      { status: 500 }
    );
  }
}
