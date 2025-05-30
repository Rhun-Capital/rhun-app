'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSubscription } from '@/hooks/use-subscription';
import { getAgents } from '@/utils/actions';
import Link from 'next/link';
import { PlusIcon } from '@/components/icons';
import { EditIcon, FilterIcon, AlertCircle } from 'lucide-react';
import LoadingIndicator from '@/components/loading-indicator';
import { AgentAttributes, FilterType } from '../types/agent';

function CreateAgentButton() {
  return (
    <Link 
      href="/agents/create"
      className="flex items-center gap-2 px-4 py-2 bg-indigo-500 rounded-lg transition w-full sm:w-auto justify-center sm:justify-start hover:bg-indigo-600"
    >
      <span className="whitespace-nowrap">Create New Agent</span>
      <PlusIcon />
    </Link>
  );
}

function CreateAgentCard() {
  return (
    <div className="group hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all duration-300 relative overflow-hidden rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
      <Link href="/agents/create" className="block">
        <div className="relative h-48 overflow-hidden rounded-lg transition-all duration-300">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black opacity-95"></div>
          
          {/* 3D Grid Pattern */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity duration-300"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)
                `,
                backgroundSize: '30px 30px',
                transform: 'perspective(1000px) rotateX(45deg)',
                transformOrigin: '50% 100%',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
          
          {/* Content gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/50 to-transparent" />
          
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 sm:gap-4 text-zinc-400 z-10">
            <span className="text-sm font-medium text-center">Create Agent</span>
            <PlusIcon className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform duration-300" />
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function AgentsPage() {
  const { user, getAccessToken } = usePrivy();
  const [agents, setAgents] = useState<AgentAttributes[]>([]);
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
          description: item.description || '',
          imageUrl: item.imageUrl,
          isTemplate: true,
          updatedAt: item.updatedAt || '',
          coreCapabilities: item.configuration?.coreCapabilities || '',
          interactionStyle: item.configuration?.interactionStyle || '',
          analysisApproach: item.configuration?.analysisApproach || '',
          riskCommunication: item.configuration?.riskCommunication || '',
          responseFormat: item.configuration?.responseFormat || '',
          limitationsDisclaimers: item.configuration?.limitationsDisclaimers || '',
          prohibitedBehaviors: item.configuration?.prohibitedBehaviors || '',
          knowledgeUpdates: item.configuration?.knowledgeUpdates || '',
          styleGuide: item.configuration?.styleGuide || '',
          specialInstructions: item.configuration?.specialInstructions || '',
          responsePriorityOrder: item.configuration?.responsePriorityOrder || ''
        }));

        // Fetch user's agents if logged in
        let userAgents: AgentAttributes[] = [];
        if (user) {
          const userData = await getAgents(user.id);
          userAgents = userData.map((item: AWS.DynamoDB.DocumentClient.AttributeMap) => ({
            id: item.id,
            name: item.name,
            description: item.description || '',
            imageUrl: item.imageUrl,
            isTemplate: false,
            updatedAt: item.updatedAt || '',
            coreCapabilities: item.configuration?.coreCapabilities || '',
            interactionStyle: item.configuration?.interactionStyle || '',
            analysisApproach: item.configuration?.analysisApproach || '',
            riskCommunication: item.configuration?.riskCommunication || '',
            responseFormat: item.configuration?.responseFormat || '',
            limitationsDisclaimers: item.configuration?.limitationsDisclaimers || '',
            prohibitedBehaviors: item.configuration?.prohibitedBehaviors || '',
            knowledgeUpdates: item.configuration?.knowledgeUpdates || '',
            styleGuide: item.configuration?.styleGuide || '',
            specialInstructions: item.configuration?.specialInstructions || '',
            responsePriorityOrder: item.configuration?.responsePriorityOrder || ''
          }));
        }

        // Combine and sort agents
        const allAgents = [...formattedTemplateData, ...userAgents].sort((a, b) => {
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
    <div className="h-screen bg-zinc-900 text-white p-4 sm:p-6 overflow-y-auto w-full">
      <div className="max-w-6xl mx-auto w-full pb-20 sm:pb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left w-full sm:w-auto">My Agents</h1>
          {user && <CreateAgentButton />}
        </div>

        <div className="flex gap-4 mb-6 overflow-x-auto pb-2 -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="flex space-x-2 min-w-max">
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
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingIndicator/>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {user && activeFilter !== 'templates' && (
              <CreateAgentCard />
            )}
                
            {filteredAgents.map((agent) => (
              <div key={agent.id} className="group hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all duration-300 relative overflow-hidden rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="relative">
                  <Link href={user && !agent.isTemplate ? `/agents/${user.id}/${agent.id}` : `/agents/template/${agent.id}`} passHref={true}>
                    <div className="relative h-48 overflow-hidden rounded-lg transition-all duration-300">
                      {/* Gradient background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black opacity-95"></div>
                      
                      {/* 3D Grid Pattern */}
                      <div className="absolute inset-0">
                        <div className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity duration-300"
                          style={{
                            backgroundImage: `
                              linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)
                            `,
                            backgroundSize: '30px 30px',
                            transform: 'perspective(1000px) rotateX(45deg)',
                            transformOrigin: '50% 100%',
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      </div>
                      
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(230,213,184,0.1), transparent)',
                          animation: 'shimmer 2s infinite',
                          backgroundSize: '200% 100%',
                        }}
                      />
                      
                      {/* Content gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/50 to-transparent" />
                      
                      <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 p-4">
                        {agent.imageUrl ? (
                          <img 
                            src={agent.imageUrl} 
                            alt={agent.name}
                            className="w-16 h-16 rounded-full object-cover mb-3 group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                            <span className="text-2xl text-zinc-400">
                              {agent.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <h2 className="text-lg sm:text-xl font-semibold text-white group-hover:text-indigo-400 transition-colors text-center z-10">
                          {agent.name}
                        </h2>
                        {agent.isTemplate && (
                          <span className="px-2 py-1 bg-indigo-900/60 backdrop-blur-sm rounded text-xs text-indigo-200 z-10">
                            Template
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                  {user && (
                    <Link 
                      href={`/agents/${agent.isTemplate ? 'template' : user.id}/${agent.id}/edit`}
                      className="absolute top-2 right-2 p-2 bg-zinc-700/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-400 z-20"
                    >
                      <EditIcon className="w-4 h-4 text-white"/>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes glow {
          0%, 100% { 
            box-shadow: 0 0 5px rgba(255, 255, 255, 0.2),
                       0 0 10px rgba(255, 255, 255, 0.1);
          }
          50% { 
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.4),
                       0 0 20px rgba(255, 255, 255, 0.2);
          }
        }
      `}</style>
    </div>
  );
} 