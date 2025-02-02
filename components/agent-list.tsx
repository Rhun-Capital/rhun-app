'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { getAgents } from '@/utils/actions';
import Link from 'next/link';
import { PlusIcon } from '@/components/icons';
import { EditIcon, FilterIcon } from 'lucide-react';
import LoadingIndicator from '@/components/loading-indicator';

type AttributeMap = {
  id: string;
  name: string;
  imageUrl?: string;
  isTemplate?: boolean;
  updatedAt: string;
};

type FilterType = 'all' | 'templates' | 'custom';


export default function AgentsPage() {
  const { user, getAccessToken } = usePrivy();
  const [agents, setAgents] = useState<AttributeMap[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        // Fetch template agents first
        const templateData = await getTemplateAgents();
        const formattedTemplateData = templateData.map((item: AWS.DynamoDB.DocumentClient.AttributeMap) => ({
          id: item.id,
          name: item.name,
          imageUrl: item.imageUrl,
          isTemplate: true,
          updatedAt: item.updatedAt || '',
        }));

        // Fetch user's agents if logged in
        let userAgents: AttributeMap[] = [];
        if (user) {
          const userData = await getAgents(user.id);
          userAgents = userData.map((item: AWS.DynamoDB.DocumentClient.AttributeMap) => ({
            id: item.id,
            name: item.name,
            imageUrl: item.imageUrl,
            isTemplate: false,
            updatedAt: item.updatedAt || '',
          }));
        }

        // Combine and sort agents
        const allAgents = [...formattedTemplateData, ...userAgents].sort((a, b) => {
          
          // Sort by updatedAt (most recent first)
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

        setAgents(allAgents);
      } catch (error) {
        console.error('Error fetching agents:', error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [user]);

  const getTemplateAgents = async () => {
    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/agents/templates', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch template agents');
      }
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  }

  const filteredAgents = agents.filter(agent => {
    switch (activeFilter) {
      case 'templates':
        return agent.isTemplate;
      case 'custom':
        return !agent.isTemplate;
      default:
        return true;
    }
  });

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl font-bold">My Agents</h1>
          {user && (
            <Link 
              href="/agents/create"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 rounded-lg transition w-full sm:w-auto justify-center sm:justify-start"
            >
              <span className="whitespace-nowrap">Create New Agent</span>
              <PlusIcon />
            </Link>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex gap-4 mb-6 flex-col sm:flex-row">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm transition ${
              activeFilter === 'all'
                ? 'bg-indigo-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            All Agents
          </button>
          <button
            onClick={() => setActiveFilter('templates')}
            className={`px-4 py-2 rounded-lg text-sm transition ${
              activeFilter === 'templates'
                ? 'bg-indigo-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveFilter('custom')}
            className={`px-4 py-2 rounded-lg text-sm transition ${
              activeFilter === 'custom'
                ? 'bg-indigo-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            My Agents
          </button>
        </div>

        {loading ? <LoadingIndicator/> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {user && activeFilter !== 'templates' && (
            <Link 
            href="/agents/create"
            className="group block"
          >
            <div className="h-48 sm:h-48 p-4 sm:p-6 bg-zinc-800 rounded-lg border border-zinc-700 border-dashed
                          transition-all duration-200 ease-in-out
                          hover:border-indigo-500 hover:border-solid
                          flex flex-col items-center justify-center gap-3 sm:gap-4 text-zinc-400
                          hover:text-indigo-400">
              <span className="text-xs sm:text-sm font-medium text-center">Create Agent</span>
              <PlusIcon />              
            </div>
          </Link>
            )}
                
            {filteredAgents.map((agent) => (
              <div key={agent.id} className="group relative">
                <Link href={user && !agent.isTemplate ? `/agents/${user.id}/${agent.id}` : `/agents/template/${agent.id}`} passHref={true}>
                <div className={`h-48 sm:h-48 p-4 sm:p-6 bg-zinc-800 rounded-lg border border-transparent transition-all duration-200 ease-in-out hover:shadow-lg hover:border-indigo-400`}>
                <div className="flex flex-col h-full items-center justify-center">
                  {agent.imageUrl ? (
                    <img 
                      src={agent.imageUrl} 
                      alt={agent.name}
                      className="w-16 h-16 rounded-full object-cover mb-3"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center mb-3">
                      <span className="text-2xl text-zinc-400">
                        {agent.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <h2 className="text-lg sm:text-xl font-semibold group-hover:text-indigo-400 transition-colors text-center">
                    {agent.name}
                  </h2>
                  {agent.isTemplate && (
                    <span className="mt-2 px-2 py-1 bg-indigo-900 rounded text-xs text-indigo-200">
                      Template
                    </span>
                  )}
                </div>
              </div>
                </Link>
                {user && (
                  <Link 
                    href={`/agents/${agent.isTemplate ? 'template' : user.id}/${agent.id}/edit`}
                    className="absolute top-2 right-2 p-2 bg-zinc-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-400"
                  >
                    <EditIcon className="w-4 h-4 text-white"/>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}