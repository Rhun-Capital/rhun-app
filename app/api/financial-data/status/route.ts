// app/api/financial-data/status/route.ts
import { NextResponse } from 'next/server';
import AWS from 'aws-sdk';

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Initialize DynamoDB client
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const FINANCIAL_DATA_TABLE = 'FinancialDataRequests';

export async function GET(request: Request) {
  try {
    // Extract requestId from the URL
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json({ error: 'Missing requestId parameter' }, { status: 400 });
    }

    // Query DynamoDB for the status
    const result = await dynamoDB.get({
      TableName: FINANCIAL_DATA_TABLE,
      Key: {
        requestId
      }
    }).promise();

    // If no results found yet, return processing status
    if (!result.Item) {
      return NextResponse.json({
        status: 'processing',
        message: 'Analysis is still in progress'
      });
    }

    // Return the analysis results
    return NextResponse.json(result.Item.data);
  } catch (error) {
    console.error('Error checking financial data status:', error);
    return NextResponse.json({ 
      status: 'error',
      error: 'Failed to check analysis status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}