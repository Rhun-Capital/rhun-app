import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { usePrivy } from '@privy-io/react-auth';
import CopyButton from './copy-button';
import { AlertCircleIcon } from './icons';
import { ApiKey } from '../types/api';

export function ApiKeyManagement() {
  const { user, getAccessToken } = usePrivy();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');

  useEffect(() => {
    fetchApiKeys();
  }, [user?.id]);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('No access token available');
      }

      const response = await fetch('/api/keys', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchApiKeys();
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setApiKeys(data || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;

    try {
      setLoading(true);
      const accessToken = await getAccessToken();
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newKeyName })
      });

      if (!response.ok) {
        throw new Error('Failed to create API key');
      }

      const newKey = await response.json();
      setApiKeys([...apiKeys, newKey]);
      setNewKeyName('');
    } catch (err) {
      setError('Failed to create API key');
      console.error('Error creating API key:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    try {
      setLoading(true);
      const accessToken = await getAccessToken();
      const response = await fetch(`/api/keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete API key');
      }

      setApiKeys(apiKeys.filter(key => key.id !== keyId));
    } catch (err) {
      setError('Failed to delete API key');
      console.error('Error deleting API key:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-zinc-400">Loading API keys...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg flex items-center gap-2">
          <AlertCircleIcon />
          <p>{error}</p>
        </div>
      )}

      {/* Create new API key */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="Enter key name"
          className="flex-1 px-3 py-2 bg-zinc-700 rounded-lg text-white placeholder-zinc-400"
        />
        <button
          onClick={createApiKey}
          disabled={loading || !newKeyName.trim()}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition disabled:opacity-50"
        >
          Create Key
        </button>
      </div>

      {/* List of API keys */}
      <div className="space-y-4">
        {apiKeys.map((key) => (
          <div key={key.id} className="bg-zinc-800 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium">{key.name}</h3>
                <p className="text-sm text-zinc-400">Created: {new Date(key.createdAt).toLocaleDateString()}</p>
                {key.lastUsed && (
                  <p className="text-sm text-zinc-400">Last used: {new Date(key.lastUsed).toLocaleDateString()}</p>
                )}
              </div>
              <button
                onClick={() => deleteApiKey(key.id)}
                className="text-red-500 hover:text-red-400"
              >
                Delete
              </button>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm bg-zinc-900 p-2 rounded break-all">{key.key}</code>
              <CopyButton text={key.key} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 