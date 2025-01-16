"use server";

import { DynamoDB } from 'aws-sdk';


const dynamodb = new DynamoDB.DocumentClient({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });
  
  export async function getAgents(userId: string) {
    const result = await dynamodb.query({
      TableName: 'Agents',
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }).promise();
  
    return result.Items || [];
  }