'use client';

import { useEffect, useState } from 'react';

type AttributeMap = {
  id: string;
  name: string;
  // Add other properties as needed
};
import { usePrivy } from '@privy-io/react-auth';
import { getAgents } from '@/utils/actions';
import Link from 'next/link';
import { PlusIcon } from '@/components/icons';

export default function AgentsPage() {
  const { user } = usePrivy();
  const [agents, setAgents] = useState<AttributeMap[]>([]);

  useEffect(() => {
    async function init() {
      const data = await getAgents(user?.id || '');
      const formattedData = data.map((item: AWS.DynamoDB.DocumentClient.AttributeMap) => ({
        id: item.id,
        name: item.name,
        // Add other properties as needed
      }));
      setAgents(formattedData);
    }
    init();
  }, [user]);

  return (
    <div className="min-h-screen dark:bg-zinc-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold">My Agents</h1>
          <Link 
            href="/agents/create"
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition"
          >
            <PlusIcon />
            Create New Agent
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Link 
              key={agent.id}
              href={`/agents/${user?.id}/${agent.id}`}
              className="group"
            >
              <div className="h-48 p-6 bg-zinc-800 rounded-lg border border-zinc-700 
                           transition-all duration-200 ease-in-out
                           hover:border-zinc-600 hover:shadow-lg hover:-translate-y-1">
                <div className="flex flex-col h-full">
                  <h2 className="text-xl font-semibold mb-2 group-hover:text-green-400 transition-colors">
                    {agent.name}
                  </h2>
                  <div className="flex-grow" />
                  <div className="flex justify-between items-center mt-4 text-sm text-zinc-400">
                    <Link 
                      key={agent.id + '-edit'}
                      href={`/agents/${user?.id}/${agent.id}/edit`}
                      className="group hover:opacity-50"
                    >View Details</Link>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {/* Add New Agent Card */}
          <Link 
            href="/agents/create"
            className="group h-48"
          >
            <div className="h-full p-6 bg-zinc-800 rounded-lg border border-zinc-700 border-dashed
                         transition-all duration-200 ease-in-out
                         hover:border-green-500 hover:border-solid
                         flex flex-col items-center justify-center gap-4 text-zinc-400
                         hover:text-green-400">
              <PlusIcon />
              <span className="text-sm font-medium">Create New Agent</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}