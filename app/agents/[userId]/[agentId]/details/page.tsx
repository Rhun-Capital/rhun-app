'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function AgentDetailsPage() {
  const params = useParams();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const response = await fetch(`/api/agents/${params.userId}/${params.agentId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch agent');
        }
        const data = await response.json();
        setAgent(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [params.userId, params.agentId]);

  if (loading) {
    return (
      <div className="min-h-screen dark:bg-zinc-900 text-gray-100 p-6">
        <div className="max-w-4xl mx-auto">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen dark:bg-zinc-900 text-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg">
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  if (!agent) return null;

  const sections = [
    { label: 'Core Capabilities', value: agent.coreCapabilities },
    { label: 'Behavioral Guidelines', value: agent.behavioralGuidelines },
    { label: 'Interaction Style', value: agent.interactionStyle },
    { label: 'Analysis Approach', value: agent.analysisApproach },
    { label: 'Risk Communication', value: agent.riskCommunication },
    { label: 'Response Format', value: agent.responseFormat },
    { label: 'Limitations & Disclaimers', value: agent.limitationsDisclaimers },
    { label: 'Prohibited Behaviors', value: agent.prohibitedBehaviors },
    { label: 'Knowledge Updates', value: agent.knowledgeUpdates },
    { label: 'Response Priority Order', value: agent.responsePriorityOrder },
    { label: 'Style Guide', value: agent.styleGuide }
  ];

  return (
    <div className="min-h-screen dark:bg-zinc-900 text-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">{agent.name}</h1>
          <Link 
            href={`/agents/${params.userId}/${params.agentId}/edit`}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg transition"
          >
            Edit Agent
          </Link>
        </div>

        <div className="space-y-6">
          {sections.map(({ label, value }) => (
            <div key={label} className="p-6 bg-zinc-800 rounded-lg border border-zinc-700">
              <h2 className="text-lg font-semibold mb-2">{label}</h2>
              <p className="text-zinc-400 whitespace-pre-wrap">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}