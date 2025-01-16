import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

async function getAgents(userId: string) {
  const result = await dynamodb.query({
    TableName: 'Agents',
    IndexName: 'userId-index',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    }
  }).promise();

  return result.Items;
}

export default async function AgentsPage() {
  // TODO: Get userId from auth session
  const userId = "example_user_id";
  const agents = await getAgents(userId);

  return (
    <div className="min-h-screen dark:bg-zinc-900 text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Agents</h1>
          <a 
            href="/agents/create"
            className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition"
          >
            Create New Agent
          </a>
        </div>

        <div className="grid gap-6">
          {agents.map((agent) => (
            <div 
              key={agent.id}
              className="p-6 bg-gray-800 rounded-lg border border-gray-700"
            >
              <h2 className="text-xl font-semibold mb-2">{agent.name}</h2>
              <p className="text-gray-400 mb-4">{agent.coreCapabilities}</p>
              <div className="flex gap-4">
                <a 
                  href={`/agents/${userId}/${agent.id}`}
                  className="text-blue-400 hover:text-blue-300"
                >
                  View Details
                </a>
                <a 
                  href={`/agents/${userId}/${agent.id}/edit`}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Edit
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}