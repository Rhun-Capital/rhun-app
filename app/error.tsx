'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4 text-center">
        <h2 className="text-2xl font-bold">Something went wrong!</h2>
        <p className="text-zinc-400">
          {error.message || 'An unexpected error occurred'}
        </p>
        <div className="space-x-4">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
} 