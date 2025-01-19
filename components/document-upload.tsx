'use client';

import { useState } from 'react';

export default function DocumentUpload() {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          type: 'text',
          source: 'manual-input'
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      setMessage(`Success! Processed ${data.chunks} chunks of text.`);
      setText('');
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // First fetch the URL content
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      setMessage('URL processed successfully');
      setUrl('');
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Text Input Form */}
      <div className="p-6 bg-zinc-800 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Upload Text</h2>
        <form onSubmit={handleTextSubmit} className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter your text here..."
            className="w-full px-4 py-2 rounded-lg bg-zinc-700 text-white placeholder-zinc-400"
            rows={6}
          />
          <button
            type="submit"
            disabled={loading || !text}
            className="px-4 py-2 bg-indigo-500 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Upload Text'}
          </button>
        </form>
      </div>

      {/* URL Input Form */}
      <div className="p-6 bg-zinc-800 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Process URL</h2>
        <form onSubmit={handleUrlSubmit} className="space-y-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL..."
            className="w-full px-4 py-2 rounded-lg bg-zinc-700 text-white placeholder-zinc-400"
          />
          <button
            type="submit"
            disabled={loading || !url}
            className="px-4 py-2 bg-indigo-500 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Process URL'}
          </button>
        </form>
      </div>

      {message && (
        <div className="p-4 bg-zinc-800 rounded-lg">
          <p>{message}</p>
        </div>
      )}
    </div>
  );
}