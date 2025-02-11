'use client';

import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { TrashIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';


export function KnowledgeList({ agentId, refreshTrigger }: { agentId: string, refreshTrigger?: number }) {
  const { getAccessToken } = usePrivy();
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const params = useParams();

  useEffect(() => {
    fetchKnowledge();
  }, [agentId, refreshTrigger]);

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

  const handleDelete = async (source: string, type: string) => {
    toast.success('Knowledge content queued for deletion');
    const key = `${source}-${type}`;
    try {
      setDeleting(key);
      const accessToken = await getAccessToken();
      const response = await fetch(
        `/api/knowledge/${agentId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ source, type }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete knowledge');
      }

      // Refresh the knowledge list
      await fetchKnowledge();
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to delete knowledge');
    } finally {
      setDeleting(null);
    }
  };

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
        <AlertCircle />
        <p className="text-sm text-white">{error}</p>
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
      {knowledge.map((item, index) => {
        const parsedItem = JSON.parse(item);
        const key = `${parsedItem.source}-${parsedItem.type}`;
        const isDeleting = deleting === key;

        return (
          <div key={index} className="p-4 bg-zinc-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {parsedItem.source}
              </span>
              {params.userId !== 'template' && <button
                onClick={() => handleDelete(parsedItem.source, parsedItem.type)}
                disabled={isDeleting}
                className="p-2 text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <TrashIcon className="w-4 h-4" />
                )}
              </button>}
            </div>
            <div className="flex gap-2">
              <span className="text-xs px-2 py-1 bg-zinc-700 rounded-full">
                {parsedItem.type}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  );
}