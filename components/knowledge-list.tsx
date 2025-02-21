'use client';

import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { TrashIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';

type KnowledgeEntry = {
  id: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  metadata: Record<string, any>;
  vectorCount: number;
}

export function KnowledgeList({ agentId, refreshTrigger }: { agentId: string, refreshTrigger?: number }) {
  const { getAccessToken } = usePrivy();
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
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
      setKnowledge(data.items); // Updated to use items from new response format
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileName: string, uploadedAt: string) => {
    toast.success('Knowledge content queued for deletion');
    const key = `${fileName}-${uploadedAt}`;
    try {
      setDeleting(key);
      const accessToken = await getAccessToken();
      const response = await fetch(
        `/api/knowledge/${agentId}?fileName=${encodeURIComponent(fileName)}&timestamp=${encodeURIComponent(uploadedAt)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete knowledge');
      }

      // Refresh the knowledge list
      await fetchKnowledge();
      toast.success('Knowledge deleted successfully');
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
      {knowledge.map((item) => {
        const key = `${item.fileName}-${item.uploadedAt}`;
        const isDeleting = deleting === key;

        return (
          <div key={item.id} className="p-4 bg-zinc-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {item.fileName}
              </span>
              {params.userId !== 'template' && (
                <button 
                  onClick={() => handleDelete(item.fileName, item.uploadedAt)}
                  disabled={isDeleting}
                  className="p-2 text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? (
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <TrashIcon className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
            <div className="flex gap-2 justify-between">
              <span className="text-xs px-2 py-1 bg-zinc-700 rounded-full">
                {item.fileType}
              </span>
              <span className="text-xs text-zinc-500 px-2 py-1">
                {new Date(item.uploadedAt).toLocaleString()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}