import { DynamoDB } from 'aws-sdk';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const dynamodb = new DynamoDB.DocumentClient({
 region: process.env.AWS_REGION,
 credentials: {
   accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
 }
});

async function verifyAndUpdateToken(token: string): Promise<boolean> {
    try {
      const result = await dynamodb.get({
        TableName: 'EarlyAccess',
        Key: { Access_key: token }
      }).promise();
  
      if (!result.Item) return false;
  
      await dynamodb.update({
        TableName: 'EarlyAccess',
        Key: { Access_key: token },
        UpdateExpression: 'SET verified = :verified',
        ExpressionAttributeValues: {
          ':verified': true
        }
      }).promise();
      
      return true;
    } catch (error) {
      console.error('DynamoDB error:', error);
      return false;
    }
  }

  export async function POST(request: Request) {
    try {
      const { token } = await request.json();
      const result = await verifyAndUpdateToken(token);
  
      if (result) {
        cookies().set('rhun_early_access_token', token, {
          maxAge: 30 * 24 * 60 * 60,
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
        return NextResponse.json({ message: 'Token verified' });
      }
  
      return NextResponse.json({ message: 'Invalid token or already used' }, { status: 401 });
    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
  }