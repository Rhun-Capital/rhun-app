import { NextResponse, NextRequest } from 'next/server';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const client = new DynamoDBClient({
 region: process.env.AWS_REGION,
 credentials: {
   accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
 }
});

const docClient = DynamoDBDocumentClient.from(client);

export async function GET(request: NextRequest) {
 try {
   const userId = request.nextUrl.searchParams.get('userId');
   if (!userId) {
     return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
   }

   const command = new QueryCommand({
     TableName: 'Chats',
     IndexName: 'userChats-index', 
     KeyConditionExpression: 'userId = :userId',
     ExpressionAttributeValues: {
       ':userId': userId
     },
     Limit: 10,
     ScanIndexForward: false
   });

   const result = await docClient.send(command);
   
   const chats = result.Items?.map(item => ({
     chatId: item.chatId,
     agentId: item.agentId,
     agentName: item.agentName,
     lastMessage: item.lastMessage,
     lastUpdated: new Date(item.lastUpdated).getTime()
   }));

   return NextResponse.json({ chats });
 } catch (error) {
   console.error('Error fetching recent chats:', error);
   return NextResponse.json({ error: 'Failed to fetch recent chats' }, { status: 500 });
 }
}