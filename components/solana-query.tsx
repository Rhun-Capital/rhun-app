import { useState } from 'react';
import { useSolana } from '@/contexts/solana-context';

interface SolanaQueryProps {
  addresses: string[];
}

export default function SolanaQuery({ addresses }: SolanaQueryProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const { executeQuery, isLoading, error } = useSolana();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const queryResults = await executeQuery(query, addresses);
      setResults(queryResults);
    } catch (err) {
      console.error('Error executing query:', err);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="query" className="block text-sm font-medium text-gray-300">
            Enter your query
          </label>
          <input
            type="text"
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mt-1 block w-full rounded-md bg-zinc-700 border-zinc-600 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="e.g., Show me transactions from the last 3 days"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Execute Query'}
        </button>
      </form>

      {error && (
        <div className="rounded-md bg-red-900/50 p-4">
          <div className="text-sm text-red-200">{error}</div>
        </div>
      )}

      {results && (
        <div className="mt-4">
          <h3 className="text-lg font-medium text-gray-300">Results</h3>
          <pre className="mt-2 rounded-md bg-zinc-800 p-4 overflow-auto max-h-96">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 