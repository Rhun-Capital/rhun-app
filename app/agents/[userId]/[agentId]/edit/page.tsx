'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AgentForm from '@/components/agent-form';

export default function EditAgentPage() {
  const params = useParams();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        // TODO: Replace hardcoded userId with actual user ID from auth
        const userId = "example_user_id";
        const response = await fetch(`/api/agents/${userId}/${params.agentId}`);
        
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
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen dark:bg-zinc-900 text-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          Loading...
        </div>
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

  return <AgentForm initialData={agent} />;
}