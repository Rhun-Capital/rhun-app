'use client';

import { useState, useRef } from 'react';
import { KnowledgeList } from './knowledge-list';
import { CloseIcon } from './icons';
import { AlertCircle } from 'lucide-react';
import { useParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { toast } from "sonner";

export default function KnowledgeTab({ agentId }: { agentId: string }) {
  const { getAccessToken } = usePrivy();
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [loading3, setLoading3] = useState(false);
  const [message, setMessage] = useState('');
  const [refreshCounter, setRefreshCounter] = useState(0);
  const params = useParams();
  const topRef = useRef<HTMLDivElement>(null);
  
  const refreshKnowledge = () => {
    setRefreshCounter(prev => prev + 1);
  };

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const preview = text.length > 150 
      ? `${text.slice(0, 150).trim()}...` 
      : text.trim();    
  
    setLoading2(true);
    try {
      toast.promise(
        new Promise((resolve) => setTimeout(resolve, 4000)),
        {
          success: 'Text added to processing queue',
          error: 'Failed to process text',
        }
      );
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
      
      setMessage('Text content queued for processing. This may take up to 15 minutes.');
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
      toast.promise(
        new Promise((resolve) => setTimeout(resolve, 4000)),
        {
          loading: 'Processing URL',
          success: 'URL added to processing queue',
          error: 'Failed to process URL',
        }
      );
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
      
      setMessage('URL queued for processing. This may take up to 15 minutes.');
      toast.success('URL added to processing queue');
      setUrl(''); // Clear the input on success
      refreshKnowledge(); // Refresh the knowledge list
      
    } catch (error: any) {
      console.error('URL processing error:', error);
      setMessage(`Error: ${error.message}`);
      toast.error('Failed to process URL');
    } finally {
      setLoading3(false);
      scrollToTop();
      toast.promise(
        new Promise((resolve) => setTimeout(resolve, 4000)),
        {
          success: 'File uploaded starting queue processing',
          error: 'Failed to upload file',
        }
      );
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    setLoading(true);
    try {
      // Step 1: Get presigned URL
      const accessToken = await getAccessToken();
      const presignedResponse = await fetch(`/api/upload/${params.userId}/presigned`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}` 
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          agentId
        }),
      });

      if (!presignedResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, fileKey } = await presignedResponse.json();

      // Step 2: Upload to S3 using presigned URL
      toast.promise(
        new Promise((resolve) => setTimeout(resolve, 2000)),
        {
          loading: 'Uploading file...',
          success: 'File uploaded successfully',
          error: 'Failed to upload file',
        }
      );

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage');
      }

      // Step 3: Trigger processing
      toast.promise(
        new Promise((resolve) => setTimeout(resolve, 2000)),
        {
          loading: 'Starting processing...',
          success: 'File queued for processing',
          error: 'Failed to queue file',
        }
      );

      const processResponse = await fetch(`/api/upload/${params.userId}/process`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          fileKey,
          fileName: file.name,
          fileType: file.type,
          agentId,
          metadata: {
            type: 'file',
            contentType: file.type,
            timestamp: new Date().toISOString()
          }
        }),
      });

      if (!processResponse.ok) {
        throw new Error('Failed to queue file for processing');
      }
  
      setMessage(`File "${file.name}" uploaded and queued for processing. This may take up to 15 minutes.`);
      refreshKnowledge();
      
    } catch (error: any) {
      console.error('Upload error:', error);
      setMessage(`Error: ${error.message || 'Failed to upload file'}`);
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setLoading(false);
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

  if (params.userId === 'template') {
    return (
     <div className="border-t border-zinc-700 pt-6">
      <h3 className="text-lg font-semibold mb-4">Knowledge Base Content</h3>
      <KnowledgeList agentId={agentId} refreshTrigger={refreshCounter} />
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
            <div className="flex align-center gap-2 items-center">
              {message.includes('Error') && <AlertCircle/>}
              <p className="text-white text-sm ">
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
      <div className="p-6 bg-zinc-800 bg-opacity-40 border border-zinc-700  rounded-lg">
        <h3 className="text-md font-medium mb-4">Upload Documents</h3>
        <div className="space-y-4">
          <input
            type="file"
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.txt,.csv,.json"
            disabled={loading}
            className="block w-full text-sm text-zinc-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-500 file:text-white
              file:cursor-pointer file:hover:bg-indigo-600
              disabled:opacity-50"
          />
          <p className="text-xs text-zinc-500">
            Supported formats: PDF, CSV, JSON, Word documents, Text files
          </p>
        </div>
      </div>

      {/* Text Input Section */}
      <div className="p-6 bg-zinc-800 bg-opacity-40 border border-zinc-700  rounded-lg">
        <h3 className="text-md font-medium mb-4">Add Text Knowledge</h3>
        <form onSubmit={handleTextSubmit} className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text knowledge here..."
            className="w-full px-4 py-2 rounded-lg bg-zinc-700 bg-opacity-40 border border-zinc-700 text-white placeholder-zinc-400"
            rows={6}
          />
          <button
            type="submit"
            disabled={loading2 || !text}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg transition disabled:opacity-50"
          >
            {loading2 ? 'Adding...' : 'Add to Knowledge Base'}
          </button>
        </form>
      </div>

      {/* URL Input Section */}
      <div className="p-6 bg-zinc-800 bg-opacity-40 border border-zinc-700  rounded-lg">
        <h3 className="text-md font-medium mb-4">Add URL Knowledge</h3>
        <form onSubmit={handleUrlSubmit} className="space-y-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL to process..."
            className="w-full px-4 py-2 rounded-lg bg-zinc-700 bg-opacity-40 border border-zinc-700 text-white placeholder-zinc-400"
          />
          <button
            type="submit"
            disabled={loading3 || !url}
            className="px-4 py-2 bg-indigo-500 rounded-lg transition disabled:opacity-50"
          >
            {loading3 ? 'Processing...' : 'Process URL'}
          </button>
        </form>
      </div>

     {/* Knowledge List Section */}
     { agentId ? <div className="border-t border-zinc-700 pt-6">
        <h3 className="text-lg font-semibold mb-4">Knowledge Base Content</h3>
        <KnowledgeList agentId={agentId} refreshTrigger={refreshCounter} />
      </div> : null } 
    </div>
  );
}