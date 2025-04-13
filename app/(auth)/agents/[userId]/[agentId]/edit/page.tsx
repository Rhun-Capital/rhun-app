// app/agents/[userId]/[agentId]/edit/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AgentForm from '@/components/agent-form';
import LoadingIndicator from '@/components/loading-indicator';
import { usePrivy } from '@privy-io/react-auth';

interface Agent {
  id: string;
  userId: string;
  name: string;
  description: string;
  imageUrl?: string;
  coreCapabilities: string;
  interactionStyle: string;
  analysisApproach: string;
  riskCommunication: string;
  responseFormat: string;
  limitationsDisclaimers: string;
  prohibitedBehaviors: string;
  knowledgeUpdates: string;
  responsePriorityOrder: string;
  styleGuide: string;
  specialInstructions: string;
}

export default function EditAgentPage() {
  const params = useParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, getAccessToken } = usePrivy();

  useEffect(() => {
    const fetchAgent = async () => {
      if (!user) return;
      
      try {
        const accessToken = await getAccessToken();
        const response = await fetch(
          `/api/agents/${decodeURIComponent(params.userId as string)}/${params.agentId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch agent');
        }

        const data = await response.json();
        setAgent(data);
      } catch (err) {
        console.error('Error fetching agent:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch agent');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchAgent();
    }
  }, [user, params.userId, params.agentId, getAccessToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 text-gray-100 p-4 sm:p-6 overflow-x-hidden">
        <div className="max-w-4xl mx-auto">
          <LoadingIndicator />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-900 text-gray-100 p-4 sm:p-6 overflow-x-hidden">
        <div className="max-w-4xl mx-auto">
          <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg">
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-hidden w-full">
      <AgentForm initialData={agent} />
    </div>
  );
}