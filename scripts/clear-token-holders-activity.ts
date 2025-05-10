import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { HOLDERS_ACTIVITY_TABLE_NAME } from '../utils/aws-config';

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

async function clearTokenHoldersActivity() {
  console.log(`Starting to clear ${HOLDERS_ACTIVITY_TABLE_NAME} table...`);
  let totalDeleted = 0;
  let lastEvaluatedKey: any = undefined;

  do {
    // Scan for items
    const scanResponse = await docClient.send(new ScanCommand({
      TableName: HOLDERS_ACTIVITY_TABLE_NAME,
      ExclusiveStartKey: lastEvaluatedKey,
      Limit: 25 // Process in smaller batches to avoid timeouts
    }));

    if (!scanResponse.Items || scanResponse.Items.length === 0) {
      console.log('No more items to delete.');
      break;
    }

    // Prepare delete requests
    const deleteRequests = scanResponse.Items.map(item => ({
      DeleteRequest: {
        Key: {
          holder_address: item.holder_address,
          timestamp: item.timestamp
        }
      }
    }));

    // Delete items in batches of 25
    for (let i = 0; i < deleteRequests.length; i += 25) {
      const batch = deleteRequests.slice(i, i + 25);
      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          [HOLDERS_ACTIVITY_TABLE_NAME]: batch
        }
      }));
      totalDeleted += batch.length;
      console.log(`Deleted ${totalDeleted} items so far...`);
    }

    lastEvaluatedKey = scanResponse.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`Successfully cleared ${totalDeleted} items from ${HOLDERS_ACTIVITY_TABLE_NAME}`);
}

// Run the script
clearTokenHoldersActivity()
  .then(() => {
    console.log('Table clearing completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error clearing table:', error);
    process.exit(1);
  }); 