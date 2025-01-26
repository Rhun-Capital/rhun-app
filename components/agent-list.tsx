'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { getAgents } from '@/utils/actions';
import Link from 'next/link';
import { PlusIcon } from '@/components/icons';
import { EditIcon } from 'lucide-react';
import LoadingIndicator from '@/components/loading-indicator';


type AttributeMap = {
  id: string;
  name: string;
};

export default function AgentsPage() {
  const { user } = usePrivy();
  const [agents, setAgents] = useState<AttributeMap[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function init() {
      if (!user) return;
      setLoading(true);
      const data = await getAgents(user?.id);
      const formattedData = data.map((item: AWS.DynamoDB.DocumentClient.AttributeMap) => ({
        id: item.id,
        name: item.name,
      }));
      setAgents(formattedData);
      setLoading(false);
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

        {loading ? <LoadingIndicator/> :

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {agents.map((agent) => (
            <div key={agent.id} className="group relative">
              <Link href={`/agents/${user?.id}/${agent.id}`}>
                <div className="h-36 sm:h-48 p-4 sm:p-6 bg-zinc-800 rounded-lg border border-zinc-700 
                             transition-all duration-200 ease-in-out
                             hover:border-zinc-600 hover:shadow-lg">
                  <div className="flex flex-col h-full items-center justify-center">
                    <h2 className="text-lg sm:text-xl font-semibold mb-2 group-hover:text-indigo-400 transition-colors text-center">
                      {agent.name}
                    </h2>
                  </div>
                </div>
              </Link>
              <Link 
                href={`/agents/${user?.id}/${agent.id}/edit`}
                className="absolute top-2 right-2 p-2 bg-zinc-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <EditIcon className="w-4 h-4 text-white"/>
              </Link>
            </div>
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
        </div> }
      </div>
    </div>
  );
}