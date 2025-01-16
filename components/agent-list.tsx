'use client';
import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { getAgents } from '@/utils/actions';

export default function AgentsPage() {
  const { user } = usePrivy();
    const [agents, setAgents] = useState([]);

    useEffect(() => {
        async function init() {
            const data = await getAgents(user?.id || '');
            setAgents(data);
        }
        init();
        }, [user]);


  return (
    <div className="min-h-screen dark:bg-zinc-900 text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Agents</h1>
          <a 
            href="/agents/create"
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg transition"
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
                  href={`/agents/${user?.id}/${agent.id}`}
                  className="text-blue-400 hover:text-blue-300"
                >
                  View Details
                </a>
                <a 
                  href={`/agents/${user?.id}/${agent.id}/edit`}
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