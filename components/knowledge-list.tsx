'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, FileIcon, FileTextIcon, GlobeIcon, RefreshCw, TextIcon, TrashIcon } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { KnowledgeEntry } from '@/types/components';

export function KnowledgeList({ agentId, refreshTrigger }: { agentId: string, refreshTrigger?: number }) {
  const { getAccessToken } = usePrivy();
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const params = useParams();

  useEffect(() => {
    fetchKnowledge();
  }, [agentId, refreshTrigger]);

  const fetchKnowledge = async () => {
    try {
      setError('');
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
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    if (refreshing) return;
    setRefreshing(true);
    await fetchKnowledge();
    setLoading(false);
  };

  const handleDelete = async (entry: KnowledgeEntry) => {
    // Determine the type of knowledge entry
    const knowledgeType = entry.type || (entry.url ? 'url' : entry.fileName ? 'file' : 'text');
    
    // Determine the identifier for deletion
    let identifier: string;
    let queryParam: string;
    
    if (knowledgeType === 'url') {
      identifier = entry.url || '';
      queryParam = `url=${encodeURIComponent(identifier)}`;
    } else if (knowledgeType === 'file') {
      identifier = entry.fileName || '';
      queryParam = `fileName=${encodeURIComponent(identifier)}`;
    } else { // text
      identifier = entry.title || 'Text content';
      // For text, we need the SK directly as text doesn't have a simple identifier
      const sk = entry.id.split('#')[1]; // Extract SK from the id
      queryParam = `textId=${encodeURIComponent(sk)}`;
    }
    
    const key = `${identifier}-${entry.uploadedAt}`;
    
    toast.success(`${knowledgeType.charAt(0).toUpperCase() + knowledgeType.slice(1)} queued for deletion`);
    
    try {
      setDeleting(key);
      const accessToken = await getAccessToken();
      
      const response = await fetch(
        `/api/knowledge/${agentId}?${queryParam}&timestamp=${encodeURIComponent(entry.uploadedAt)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete ${knowledgeType}`);
      }

      // Refresh the knowledge list
      await fetchKnowledge();
      toast.success(`${knowledgeType.charAt(0).toUpperCase() + knowledgeType.slice(1)} deleted successfully`);
    } catch (err: any) {
      setError(err.message);
      toast.error(`Failed to delete ${knowledgeType}`);
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
        <button 
          onClick={handleRefresh}
          className="ml-auto p-2 text-white hover:text-blue-300 transition-colors"
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Knowledge Base</h3>
        <button 
          onClick={handleRefresh}
          className="p-2 text-zinc-400 hover:text-blue-400 transition-colors"
          disabled={refreshing}
          title="Refresh knowledge list"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {!knowledge.length ? (
        <div className="p-6 bg-zinc-800 rounded-lg text-zinc-400">
          No knowledge has been added to this agent yet.
        </div>
      ) : (
        knowledge.map((item) => {
          // Determine the type of knowledge entry
          const knowledgeType = item.type || (item.url ? 'url' : item.fileName ? 'file' : 'text');
          
          // Get the appropriate data based on type
          let displayName: string;
          let displayType: string;
          let icon;
          
          if (knowledgeType === 'url') {
            displayName = item.metadata?.title || item.url || 'URL';
            displayType = 'url';
            icon = <GlobeIcon className="w-4 h-4 text-blue-400" />;
          } else if (knowledgeType === 'file') {
            displayName = item.fileName || 'File';
            displayType = item.fileType || 'file';
            
            // Handle text files differently
            if (item.fileType && ['txt', 'md', 'csv', 'json'].includes(item.fileType.toLowerCase())) {
              icon = <FileTextIcon className="w-4 h-4 text-amber-400" />;
            } else {
              icon = <FileIcon className="w-4 h-4 text-zinc-400" />;
            }
          } else { // text
            displayName = item.title || 'Text content';
            displayType = 'text';
            icon = <TextIcon className="w-4 h-4 text-green-400" />;
          }
          
          const identifier = 
            knowledgeType === 'url' ? item.url :
            knowledgeType === 'file' ? item.fileName :
            item.title;
            
          const key = `${identifier}-${item.uploadedAt}`;
          const isDeleting = deleting === key;

          return (
            <div key={item.id} className="p-4 bg-zinc-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {icon}
                  <span className="text-sm font-medium truncate max-w-xs">
                    {displayName}
                  </span>
                </div>
                {params?.userId !== 'template' && (
                  <button 
                    onClick={() => handleDelete(item)}
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
                  {displayType}
                </span>
                <span className="text-xs text-zinc-500 px-2 py-1">
                  {new Date(item.uploadedAt).toLocaleString()}
                </span>
              </div>
              {knowledgeType === 'url' && item.url && (
                <div className="mt-2 text-xs text-zinc-500 truncate">
                  {item.url}
                </div>
              )}
              {knowledgeType === 'text' && item.textPreview && (
                <div className="mt-2 text-xs text-zinc-500 line-clamp-2">
                  {item.textPreview}...
                </div>
              )}
              {knowledgeType === 'file' && ['txt', 'md', 'csv', 'json'].includes(item.fileType?.toLowerCase() || '') && item.metadata?.textPreview && (
                <div className="mt-2 text-xs text-zinc-500 line-clamp-2">
                  {item.metadata.textPreview}...
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}