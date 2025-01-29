// app/api/template-agents/route.ts
import { NextResponse } from 'next/server';
import { DynamoDB } from 'aws-sdk';

const dynamoDB = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

const TEMPLATE_AGENT_IDS = [
  'cc425065-b039-48b0-be14-f8afa0704357',
  '067d93bb-e4de-4f61-a016-1df24408fb48',
  '7e5c79e5-e401-4f52-817e-4dcf83fd1898',
  'a949744d-b233-488c-8959-212fd2e219b6',
  '24d7ac78-ce3d-4e88-8bba-820788ffe066',
  '9d72526d-dc3f-424e-a46a-c6120511dde6',
  '391d59b2-f96b-4129-b3c1-9159116a02d5',
  'c4997a4c-1104-42b2-8993-d928d7413e91'
];

export async function GET() {
  try {
    const params = {
      RequestItems: {
        'Agents': {
          Keys: TEMPLATE_AGENT_IDS.map(id => ({
            userId: 'template', // Assuming this is your partition key
            id: id // This is your sort key
          }))
        }
      }
    };

    const { Responses } = await dynamoDB.batchGet(params).promise();
    
    if (!Responses || !Responses.Agents) {
      throw new Error('No responses received from DynamoDB');
    }

    // Sort the agents to maintain the order defined in TEMPLATE_AGENT_IDS
    const sortedAgents = Responses.Agents.sort((a, b) => {
      const indexA = TEMPLATE_AGENT_IDS.indexOf(a.id);
      const indexB = TEMPLATE_AGENT_IDS.indexOf(b.id);
      return indexA - indexB;
    });

    return NextResponse.json(sortedAgents);
  } catch (error) {
    console.error('Error fetching template agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template agents' },
      { status: 500 }
    );
  }
}