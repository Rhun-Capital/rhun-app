import { DynamoDB } from 'aws-sdk';
import { notFound } from 'next/navigation';

const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

async function getAgent(userId: string, id: string) {
  const result = await dynamodb.get({
    TableName: 'Agents',
    Key: {
      id,
      userId
    }
  }).promise();

  if (!result.Item) {
    notFound();
  }

  return result.Item;
}

export default async function AgentPage({ params }: { params: { id: string } }) {
  // TODO: Get userId from auth session
  const userId = "test-user";
  const agent = await getAgent(userId, params.id);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">{agent.name}</h1>
          <a 
            href={`/agents/${agent.id}/edit`}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
          >
            Edit Agent
          </a>
        </div>

        <div className="space-y-6">
          {[
            { label: 'Core Capabilities', value: agent.coreCapabilities },
            { label: 'Interaction Style', value: agent.interactionStyle },
            { label: 'Analysis Approach', value: agent.analysisApproach },
            { label: 'Risk Communication', value: agent.riskCommunication },
            { label: 'Response Format', value: agent.responseFormat },
            { label: 'Limitations & Disclaimers', value: agent.limitationsDisclaimers },
            { label: 'Prohibited Behaviors', value: agent.prohibitedBehaviors },
            { label: 'Knowledge Updates', value: agent.knowledgeUpdates },
            { label: 'Response Priority Order', value: agent.responsePriorityOrder },
            { label: 'Style Guide', value: agent.styleGuide }
          ].map(({ label, value }) => (
            <div key={label} className="p-6 bg-gray-800 rounded-lg border border-gray-700">
              <h2 className="text-lg font-semibold mb-2">{label}</h2>
              <p className="text-gray-400 whitespace-pre-wrap">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}