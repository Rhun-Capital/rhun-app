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
      if (!user) return;
      const data = await getAgents(user?.id);
      const formattedData = data.map((item: AWS.DynamoDB.DocumentClient.AttributeMap) => ({
        id: item.id,
        name: item.name,
      }));
      setAgents(formattedData);
    }
    init();
  }, [user]);

  return (
    <div className="min-h-screen dark:bg-zinc-900 text-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl font-bold">My Agents</h1>
          <Link 
            href="/agents/create"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 rounded-lg transition w-full sm:w-auto justify-center sm:justify-start"
          >
            <PlusIcon />
            <span className="whitespace-nowrap">Create New Agent</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {agents.map((agent) => (
            <Link 
              key={agent.id}
              href={`/agents/${user?.id}/${agent.id}`}
              className="group"
            >
              <div className="h-36 sm:h-48 p-4 sm:p-6 bg-zinc-800 rounded-lg border border-zinc-700 
                           transition-all duration-200 ease-in-out
                           hover:border-zinc-600 hover:shadow-lg hover:-translate-y-1">
                <div className="flex flex-col h-full items-center justify-center">
                  <h2 className="text-lg sm:text-xl font-semibold mb-2 group-hover:text-indigo-400 transition-colors text-center">
                    {agent.name}
                  </h2>
                </div>
              </div>
            </Link>
          ))}

          <Link 
            href="/agents/create"
            className="group h-36 sm:h-48"
          >
            <div className="h-full p-4 sm:p-6 bg-zinc-800 rounded-lg border border-zinc-700 border-dashed
                         transition-all duration-200 ease-in-out
                         hover:border-indigo-500 hover:border-solid
                         flex flex-col items-center justify-center gap-3 sm:gap-4 text-zinc-400
                         hover:text-indigo-400">
              <PlusIcon />
              <span className="text-xs sm:text-sm font-medium text-center">Create New Agent</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}