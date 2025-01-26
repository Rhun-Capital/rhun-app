'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AgentForm from '@/components/agent-form';
import LoadingIndicator from '@/components/loading-indicator';
import { usePrivy } from '@privy-io/react-auth';

export default function EditAgentPage() {
  const params = useParams();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, getAccessToken } = usePrivy();

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const accessToken = await getAccessToken();
        const userId = user?.id || '';
        const response = await fetch(
          `/api/agents/${userId}/${params.agentId}`,
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
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [user, params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 text-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          <LoadingIndicator />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-900 text-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg">
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  return <AgentForm initialData={agent} />;
}