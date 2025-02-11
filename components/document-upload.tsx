'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

export default function DocumentUpload() {
  const { getAccessToken } = usePrivy();
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const preview = text.length > 150 
      ? `${text.slice(0, 150).trim()}...` 
      : text.trim();    
  
    setLoading2(true);
    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/upload', {
        method: 'POST',      
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          text,
          type: 'text',
          source: `text-input | ${preview}`,
          agentId: agentId || params?.agentId,
        }),
      });
  
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      setMessage('Text content queued for processing. This may take a few minutes.');
      toast.success('Text added to processing queue');
      setText(''); // Clear the input on success
      refreshKnowledge(); // Refresh the knowledge list
    } catch (error: any) {
      console.error('Text processing error:', error);
      setMessage(`Error: ${error.message}`);
      toast.error('Failed to process text');
    } finally {
      setLoading2(false);
      scrollToTop();
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
  
    setLoading3(true);
    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${accessToken}` 
        },
        body: JSON.stringify({ 
          url,
          agentId: agentId || params?.agentId,
          metadata: {
            type: 'url',
            timestamp: new Date().toISOString(),
            source: url
          }
        }),
      });
  
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      setMessage('URL queued for processing. This may take a few minutes.');
      toast.success('URL added to processing queue');
      setUrl(''); // Clear the input on success
      refreshKnowledge(); // Refresh the knowledge list
      
    } catch (error: any) {
      console.error('URL processing error:', error);
      setMessage(`Error: ${error.message}`);
      toast.error('Failed to process URL');
    } finally {
      scrollToTop();
      setLoading3(false);
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