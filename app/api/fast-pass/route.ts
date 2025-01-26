import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function POST(request: Request) {
 try {
   const { id, order } = await request.json();

   const response = await fetch(`https://dynamodb.${process.env.AWS_REGION}.amazonaws.com`, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/x-amz-json-1.0',
       'X-Amz-Target': 'DynamoDB_20120810.PutItem',
       'Authorization': `AWS4-HMAC-SHA256 Credential=${process.env.AWS_ACCESS_KEY_ID}/${process.env.AWS_REGION}/dynamodb/aws4_request`,
     },
     body: JSON.stringify({
       TableName: process.env.DYNAMODB_TABLE_NAME,
       Item: {
         'id': { 'S': id },
         'order': { 'S': JSON.stringify(order) },
         'createdAt': { 'S': new Date().toISOString() }
       }
     })
   });

   if (!response.ok) {
     throw new Error(`DynamoDB error: ${response.status}`);
   }

   return NextResponse.json({ success: true, id });
 } catch (error) {
   console.error("Error saving to DynamoDB:", error);
   return NextResponse.json({ error: "Failed to save order" }, { status: 500 });
 }
}