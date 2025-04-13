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

    // Query DynamoDB for the complete data
    const result = await dynamoDB.get({
      TableName: FINANCIAL_DATA_TABLE,
      Key: {
        requestId
      }
    }).promise();

    // If no results found, return appropriate message
    if (!result.Item) {
      return NextResponse.json({
        status: 'not_found',
        message: 'No data found for this request ID'
      }, { status: 404 });
    }

    // Return the complete analysis data
    return NextResponse.json({
      requestId,
      status: 'success',
      data: result.Item.data // Return the full data object from DynamoDB
    });
  } catch (error) {
    console.error('Error fetching complete financial data:', error);
    return NextResponse.json({ 
      status: 'error',
      error: 'Failed to fetch analysis data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 