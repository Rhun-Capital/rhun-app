import { NextResponse, NextRequest } from 'next/server';
import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient({
 region: process.env.AWS_REGION,
 credentials: {
   accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
 }
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chain, walletAddress, email, userId } = body;

    // Construct identifier based on provided parameters
    let identifier: string;
    if (walletAddress && chain) {
      identifier = `${chain}:${walletAddress}`;
    } else if (email && chain) {
      identifier = `email:${email}:${chain}`;
    } else {
      return NextResponse.json(
        { error: 'Invalid identifier parameters. Required: (walletAddress, chain) or (email, chain) or (userId, chain)' },
        { status: 400 }
      );
    }
    const response = await fetch(
      `${process.env.CROSSMINT_API_URL}/wallets/${identifier}/nfts?page=1&perPage=1`,
      {
        method: 'GET',
        headers: {
          'X-API-KEY': process.env.CROSSMINT_SERVER_API_KEY as string,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Crossmint API returned ${response.status}`);
    }

    const data = await response.json();

    // fetch the user from the NFTOrders table first 
    const userParams = {
        TableName: 'NFTOrders',
        Key: {
            userId,
        },
    };

    const userResponse = await dynamodb.get(userParams).promise();

    if (data.length > 0 && userResponse.Item) {
        const params = {
            TableName: 'NFTOrders',
            Item: {
                ...userResponse.Item,
                isVerified: true,
            },
        };

        await dynamodb.put(params).promise();
    }
    
    return NextResponse.json({
      data
    });

  } catch (error) {
    console.error('Error checking NFT existence:', error);
    return NextResponse.json(
      { error: 'Failed to check NFT existence' },
      { status: 500 }
    );
  }
}