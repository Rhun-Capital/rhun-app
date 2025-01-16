'use client';

import { useState, useRef } from 'react';
import { KnowledgeList } from './knowledge-list';
import { AlertCircleIcon, CloseIcon } from './icons';
import { useParams } from 'next/navigation';

export default function KnowledgeTab({ agentId }: { agentId: string }) {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const params = useParams();
  const topRef = useRef<HTMLDivElement>(null);
  
    const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  }
  // ;
  // Your existing handlers...
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          type: 'text',
          source: 'manual-input',
          metadata: {
            agentId: agentId || params?.agentId,
            type: 'text-input'
          }
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      setMessage(`Success! Added to agent's knowledge base.`);
      setText(''); // Clear the input on success
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url,
          metadata: {
            agentId: agentId || params?.agentId,
            type: 'url'
          }
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      setMessage('URL processed and added to knowledge base');
      setUrl(''); // Clear the input on success
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      scrollToTop();
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('agentId', agentId);

    try {
      const response = await fetch('/api/upload/file', {
        method: 'POST',
        // Remove Content-Type header to let browser set it automatically
        body: formData,
      });
  
      const data = await response.json();
      console.log(data); // Log full response for debugging
      if (!response.ok) {
        // Log the error response body
        const errorBody = await response.text();
        console.error('Error response body:', errorBody);
        throw new Error(data.error || 'Upload failed');
      }
      
      setMessage(`File "${file.name}" processed and added to knowledge base`);
    } catch (error: any) {
      console.error('Full error:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  if (!agentId) {
    return (
      <div className="p-6 bg-zinc-800 rounded-lg text-zinc-400">
        Configure your agent before adding knowledge.
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={topRef}>
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.includes('Error') 
            ? 'bg-red-900/50 border border-red-500' 
            : 'bg-green-900/50 border border-green-500'
        }`}>
          <div className="flex-1">
            <div className="flex align-center gap-2">
              {message.includes('Error') && <div className="mt-1"><AlertCircleIcon  /></div>}
              <p className="text-white">
                {message}
              </p>
            </div>
          </div>
          <button onClick={() => {setMessage('')}}><CloseIcon/></button>
        </div>
      )}      
      
      <div className="border-b border-zinc-700 pb-4">
        <h2 className="text-lg font-semibold">Agent Knowledge Base</h2>
        <p className="text-sm text-zinc-400">Add documents and text for your agent to learn from.</p>
      </div>

      {/* File Upload Section */}
      <div className="p-6 bg-zinc-800 rounded-lg">
        <h3 className="text-md font-medium mb-4">Upload Documents</h3>
        <div className="space-y-4">
          <input
            type="file"
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.txt"
            disabled={loading}
            className="block w-full text-sm text-zinc-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-green-500 file:text-white
              file:cursor-pointer file:hover:bg-green-600
              disabled:opacity-50"
          />
          <p className="text-xs text-zinc-500">
            Supported formats: PDF, Word documents, Text files
          </p>
        </div>
      </div>

      {/* Text Input Section */}
      <div className="p-6 bg-zinc-800 rounded-lg">
        <h3 className="text-md font-medium mb-4">Add Text Knowledge</h3>
        <form onSubmit={handleTextSubmit} className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text knowledge here..."
            className="w-full px-4 py-2 rounded-lg bg-zinc-700 text-white placeholder-zinc-400"
            rows={6}
          />
          <button
            type="submit"
            disabled={loading || !text}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add to Knowledge Base'}
          </button>
        </form>
      </div>

      {/* URL Input Section */}
      <div className="p-6 bg-zinc-800 rounded-lg">
        <h3 className="text-md font-medium mb-4">Add URL Knowledge</h3>
        <form onSubmit={handleUrlSubmit} className="space-y-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL to process..."
            className="w-full px-4 py-2 rounded-lg bg-zinc-700 text-white placeholder-zinc-400"
          />
          <button
            type="submit"
            disabled={loading || !url}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Process URL'}
          </button>
        </form>
      </div>

      {/* Knowledge List Section */}
      { agentId ? <div className="border-t border-zinc-700 pt-6">
        <h3 className="text-lg font-semibold mb-4">Knowledge Base Content</h3>
        <KnowledgeList agentId={agentId} />
      </div> : null } 


    </div>
  );
}