'use client';

import { useState, useEffect } from 'react';
import { AlertCircleIcon } from './icons';
import { usePrivy } from '@privy-io/react-auth';

export function KnowledgeList({ agentId, refreshTrigger }: { agentId: string, refreshTrigger?: number }) {
  const { getAccessToken } = usePrivy();
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchKnowledge = async () => {
      try {
        const accessToken = await getAccessToken();
        const response = await fetch(
          `/api/knowledge/${agentId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }            
        );
        if (!response.ok) throw new Error('Failed to fetch knowledge');
        const data = await response.json();
        setKnowledge(data.knowledge);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchKnowledge();
  }, [agentId, refreshTrigger]); // Add refreshTrigger to dependency array

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg flex items-center gap-2">
        <AlertCircleIcon />
        <p className="text-ehite">{error}</p>
      </div>
    );
  }

  if (!knowledge.length) {
    return (
      <div className="p-6 bg-zinc-800 rounded-lg text-zinc-400">
        No knowledge has been added to this agent yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {knowledge.map((item, index) => (
        <div key={index} className="p-4 bg-zinc-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {JSON.parse(item).source}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-xs px-2 py-1 bg-zinc-700 rounded-full">
              {JSON.parse(item).type}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}