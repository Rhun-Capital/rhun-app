import { NextResponse } from 'next/server';
import { GochuFun } from 'gochufun-sdk';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const data = JSON.parse(formData.get('data') as string);
    const image = formData.get('image') as File;

    // Initialize Gochu SDK with API credentials
    const gochu = new GochuFun({
      secretKey: process.env.GOCHU_SECRET_KEY || '',
      accessKey: process.env.GOCHU_ACCESS_KEY || ''
    });

    // Create token using the SDK
    const newToken = {
      image,
      tokenName: data.tokenName,
      tokenTicker: data.tokenTicker,
      tokenDescription: data.tokenDescription,
      twitter: data.twitter,
      website: data.website,
      telegram: data.telegram,
      twitch: data.twitch,
      isAntiPvp: data.isAntiPvp
    };

    const response = await gochu.createToken(newToken);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error creating token:', error);
    return NextResponse.json(
      { error: 'Failed to create token' },
      { status: 500 }
    );
  }
} 