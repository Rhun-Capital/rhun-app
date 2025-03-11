

import React, { useState, useEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Markdown } from "@/components/markdown";

interface BrowserUseResultProps {
toolCallId: string;
toolInvocation: any;
}

export default function BrowserUseResult({ toolCallId, toolInvocation }: BrowserUseResultProps) {
// Directly use toolInvocation.result as the initial state
const [data, setData] = useState(toolInvocation.result);
const [isPolling, setIsPolling] = useState(false);
const [activeTab, setActiveTab] = useState<'results' | 'live' | 'steps'>('results');
const [steps, setSteps] = useState<any[]>([]);
const { getAccessToken } = usePrivy();
const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  // Update state after initial render if needed
  setData(toolInvocation.result);
  
  // Initialize steps if they exist in the result
  if (toolInvocation.result?.steps && Array.isArray(toolInvocation.result.steps)) {
    setSteps(toolInvocation.result.steps);
  }
  
}, [toolInvocation]);

// Cleanup interval on unmount
useEffect(() => {
  return () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
  };
}, []);

// Separate effect for starting/stopping polling
useEffect(() => {
  // Function to poll for data
  const pollData = async () => {
    if (!data?.taskId) return;
    
    try {
      const accessToken = await getAccessToken();
      
      const response = await fetch(`/api/browser-use?taskId=${data.taskId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get task status');
      }
      
      const taskData = await response.json();
      
      // Update steps if they exist in the response
      if (taskData.steps && Array.isArray(taskData.steps)) {
        setSteps(taskData.steps);
      }
      
      // Preserve the taskId in case it's missing in the response
      if (!taskData.taskId && data.taskId) {
        taskData.taskId = data.taskId;
      }
      
      // Ensure live URL is preserved
      if (!taskData.liveUrl && !taskData.live_url) {
        if (data.liveUrl) taskData.liveUrl = data.liveUrl;
        if (data.live_url) taskData.live_url = data.live_url;
      }
      
      // Update data with latest task info
      setData(taskData);
      
      if (['finished', 'failed', 'stopped'].includes(taskData.status)) {
        setIsPolling(false);
      }
    } catch (error) {
      console.error('Error polling for status:', error);
      setIsPolling(false);
    }
  };

  // Start polling when isPolling is true
  if (isPolling && data?.taskId) {
    // Poll immediately first
    pollData();
    
    // Then set interval
    pollIntervalRef.current = setInterval(pollData, 10000);
    console.log('Started polling interval');
    
    // Clean up when component unmounts or when isPolling changes
    return () => {
      if (pollIntervalRef.current) {
        console.log('Clearing polling interval');
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }
}, [isPolling, data?.taskId, getAccessToken]);

// Separate effect to determine when polling should start/stop
useEffect(() => {
  if (!data) return;
  
  // Store the taskId in a ref to make sure we don't lose it
  if (data.taskId) {
    const taskIdRef = data.taskId;
    
    const shouldPoll = (data?.status === 'running' || data?.status === 'created');
    
    if (shouldPoll && !isPolling) {
      console.log('Starting polling for task:', taskIdRef);
      setIsPolling(true);
    } else if (!shouldPoll && isPolling) {
      console.log('Stopping polling for task:', taskIdRef);
      setIsPolling(false);
    }
  }
}, [data, isPolling, data?.status]);

// Determine which tool was called
const getToolTitle = () => {
  const toolMap: Record<string, string> = {
    webResearch: "Web Research",
    tokenAnalysis: "Token Analysis",
    newTokenMonitor: "New Token Monitor",
    cryptoNews: "Crypto News Monitor",
    socialListening: "Social Media Analysis"
  };
  
  return toolMap[toolInvocation.toolName] || "Browser Research";
};
 // Function to check if live URL is still valid (less than 5 minutes old)
 const isLiveUrlValid = (finishedAt: string | null | undefined) => {
  if (finishedAt == null) return false;
  
  try {
    const now = new Date();
    // We need to handle the timestamp as local time since that's how it's being provided
    // The issue is that the server doesn't include 'Z' at the end of the timestamp
    // which means it's being treated as local time by the Date constructor
    let finishedDateStr = finishedAt;
    
    // Add the 'Z' suffix if it doesn't already have a timezone indicator
    if (!finishedDateStr.endsWith('Z') && !finishedDateStr.includes('+')) {
      finishedDateStr = finishedDateStr + 'Z';
    }
    
    const finishedDate = new Date(finishedDateStr);
    
    // Calculate elapsed time in minutes
    const elapsedMs = now.getTime() - finishedDate.getTime();
    const elapsedMinutes = elapsedMs / (1000 * 60);
    
    // Allow time differences in both directions with a 5-minute window
    // This handles any minor clock synchronization issues
    return elapsedMinutes < 5 && elapsedMinutes > -5;
  } catch (error) {
    console.error('Error in date calculation:', error);
    return false;
  }
};

// Check if the live URL should be displayed
const shouldShowLiveUrl = () => {
  return (data.liveUrl || data.live_url) && isLiveUrlValid(data.finished_at);
};

// Determine subtitle based on args
const getSubtitle = () => {
  const args = toolInvocation.args;
  switch (toolInvocation.toolName) {
    case 'webResearch':
      return `Research: ${args.query}`;
    case 'tokenAnalysis':
      return `Analysis of ${args.tokenName}`;
    case 'newTokenMonitor':
      return `Monitoring ${args.chain || 'all chains'} - ${args.timeframe || 'recent'}`;
    case 'cryptoNews':
      return args.topic ? `News about ${args.topic}` : 'Recent Crypto News';
    case 'socialListening':
      return `Social media analysis for ${args.token}`;
    default:
      return '';
  }
};

if (!data) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2">
      <div className="text-zinc-400">Loading browser research data...</div>
    </div>
  );
}

if (data.error) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2 text-white">
      <h3 className="font-medium text-lg mb-2">{getToolTitle()}</h3>
      <div className="text-red-400 mt-2">{data.error}</div>
      <div className="text-sm text-zinc-400 mt-2">{getSubtitle()}</div>
    </div>
  );
}

const isRunning = ['created', 'running', 'paused'].includes(data.status);

if (isRunning) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden my-2 text-white">
      {/* Header */}
      <div className="p-4 border-b border-zinc-700">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">{getToolTitle()}</h3>
          <div className={`px-3 py-1 rounded-full text-xs font-medium bg-blue-800 text-blue-100 animate-pulse`}>
            {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
          </div>
        </div>
        <div className="text-sm text-zinc-400 mt-1">{getSubtitle()}</div>
      </div>
      
      {/* Tabs for running task */}
      <div className="flex border-b border-zinc-700">
        <button
          className={`px-4 py-2 text-sm ${activeTab === 'steps' ? 'text-white border-b-2 border-indigo-500' : 'text-zinc-400'}`}
          onClick={() => setActiveTab('steps')}
        >
          Progress
        </button>
          <button
            className={`px-4 py-2 text-sm ${activeTab === 'live' ? 'text-white border-b-2 border-indigo-500' : 'text-zinc-400'}`}
            onClick={() => setActiveTab('live')}
          >
            Live View
          </button>
      </div>
      
      {/* Progress content */}
      {activeTab === 'steps' && (
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
            <div className="text-indigo-400">
              {isPolling ? "Running browser research..." : "Preparing browser research..."}
            </div>
          </div>
          
          {steps.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {steps.map((step, index) => (
                <div key={index} className="border border-zinc-700 rounded-md p-3 bg-zinc-800/50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-sm">Step {step.step || index + 1}</span>
                    {index === steps.length - 1 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-indigo-900/50 text-indigo-300">Current</span>
                    )}
                  </div>
                  
                  {step.next_goal && (
                    <div className="text-sm">
                      <span className="text-indigo-400">Goal: </span>
                      <span>{step.next_goal}</span>
                    </div>
                  )}
                  
                  {step.evaluation_previous_goal && (
                    <div className="text-xs text-zinc-400 mt-1 italic">
                      {step.evaluation_previous_goal}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-zinc-400 text-sm italic">
              Waiting for browser steps to begin...
            </div>
          )}
          
          <div className="mt-4 text-xs text-zinc-500">
            Task ID: {data.taskId}
          </div>
        </div>
      )}
      
      {/* Live View iframe */}
      {activeTab === 'live' && shouldShowLiveUrl() && (
        <div className="relative" style={{ height: '500px' }}>
          <iframe
            src={data.liveUrl || data.live_url}
            className="w-full h-full border-0"
            title="Browser Use Live View"
            sandbox="allow-same-origin allow-scripts"
          />
          
          <div className="absolute top-2 right-2">
            <a
              href={data.liveUrl || data.live_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-zinc-800 text-white hover:bg-zinc-700 px-3 py-1 rounded-md text-xs flex items-center gap-1"
            >
              <span>Open in new window</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path>
                <path d="M15 3h6v6"></path>
                <path d="M10 14L21 3"></path>
              </svg>
            </a>
          </div>
        </div>
      )}
      
      {/* Show message when live URL has expired */}
      {activeTab === 'live' && (data.liveUrl || data.live_url) && !shouldShowLiveUrl() && (
        <div className="p-8 text-center">
          <div className="bg-yellow-800/30 text-yellow-300 p-4 rounded-md inline-block mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <div className="font-medium">Live session has expired</div>
          </div>
          <p className="text-zinc-400 text-sm mt-2">
            The live browser session is only available for 5 minutes after creation.
            <br />
            Please view the results or steps instead.
          </p>
          <button
            onClick={() => setActiveTab('steps')}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm"
          >
            View Progress Steps
          </button>
        </div>
      )}
    </div>
  );
}

return (
  <div className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden my-2 text-white">
    {/* Header */}
    <div className="p-4 border-b border-zinc-700">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">{getToolTitle()}</h3>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          data.status === 'finished' ? 'bg-green-800 text-green-100' :
          data.status === 'failed' ? 'bg-red-800 text-red-100' :
          'bg-yellow-800 text-yellow-100'
        }`}>
          {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
        </div>
      </div>
      <div className="text-sm text-zinc-400 mt-1">{getSubtitle()}</div>
    </div>
    
    {/* Tabs for completed task */}
    <div className="flex border-b border-zinc-700">
      <button
        className={`px-4 py-2 text-sm ${activeTab === 'results' ? 'text-white border-b-2 border-indigo-500' : 'text-zinc-400'}`}
        onClick={() => setActiveTab('results')}
      >
        Results
      </button>
      
      {steps.length > 0 && (
        <button
          className={`px-4 py-2 text-sm ${activeTab === 'steps' ? 'text-white border-b-2 border-indigo-500' : 'text-zinc-400'}`}
          onClick={() => setActiveTab('steps')}
        >
          Steps ({steps.length})
        </button>
      )}
      
      
        <button
          className={`px-4 py-2 text-sm ${activeTab === 'live' ? 'text-white border-b-2 border-indigo-500' : 'text-zinc-400'}`}
          onClick={() => setActiveTab('live')}
        >
          Live View
        </button>
    </div>
    
    {/* Results Content */}
    {activeTab === 'results' && (
      <div className="p-4">
        <div className="prose prose-invert max-w-none">
          <Markdown>{data.output}</Markdown>
        </div>
        
        <div className="mt-4 pt-4 border-t border-zinc-700 text-xs text-zinc-500">
          <div className="flex justify-between">
            <span>Task ID: {data.taskId}</span>
            <span>Finished: {data.finished_at ? new Date(data.finished_at).toLocaleString() : 'N/A'}</span>
          </div>
        </div>
      </div>
    )}
    
    {/* Steps Content for completed task */}
    {activeTab === 'steps' && (
      <div className="p-4">
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {steps.map((step, index) => (
            <div key={index} className="border border-zinc-700 rounded-md p-3 bg-zinc-800/50">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-sm">Step {step.step || index + 1}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-green-900/30 text-green-300">Completed</span>
              </div>
              
              {step.next_goal && (
                <div className="text-sm">
                  <span className="text-indigo-400">Goal: </span>
                  <span>{step.next_goal}</span>
                </div>
              )}
              
              {step.evaluation_previous_goal && (
                <div className="text-xs text-zinc-400 mt-1 italic">
                  <span className="text-green-400">✓ </span>
                  {step.evaluation_previous_goal}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-zinc-700">
          <div className="text-sm text-zinc-300">
            <span className="font-medium">Total Steps:</span> {steps.length}
          </div>
        </div>
      </div>
    )}
    
    {/* Live View iframe for completed task */}
    {activeTab === 'live' && shouldShowLiveUrl() && (
      <div className="relative" style={{ height: '500px' }}>
        <iframe
          src={data.liveUrl || data.live_url}
          className="w-full h-full border-0"
          title="Browser Use Live View"
          sandbox="allow-same-origin allow-scripts"
        />
        
        <div className="absolute top-2 right-2">
          <a
            href={data.liveUrl || data.live_url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-zinc-800 text-white hover:bg-zinc-700 px-3 py-1 rounded-md text-xs flex items-center gap-1"
          >
            <span>Open in new window</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path>
              <path d="M15 3h6v6"></path>
              <path d="M10 14L21 3"></path>
            </svg>
          </a>
        </div>
      </div>
    )}
    
    {/* Show message when live URL has expired for completed task */}
    {activeTab === 'live' && (data.liveUrl || data.live_url) && !shouldShowLiveUrl() && (
      <div className="p-8 text-center">
        <div className="bg-yellow-800/30 text-yellow-300 p-4 rounded-md inline-block mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <div className="font-medium">Live session has expired</div>
        </div>
        <p className="text-zinc-400 text-sm mt-2">
          The live browser session is only available for 5 minutes after creation.
          <br />
          Please view the results or steps instead.
        </p>
        <button
          onClick={() => setActiveTab('results')}
          className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm"
        >
          View Results
        </button>
      </div>
    )}
  </div>
);
}