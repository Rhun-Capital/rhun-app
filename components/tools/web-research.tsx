// components/tools/BrowserUseResult.tsx
import React, { useState, useEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Markdown } from "@/components/markdown";
import { toast } from "sonner"; 
import { BrowserUseResultProps } from '@/types/components';

interface TaskData {
  taskId: string;
  status: string;
  result?: any;
  error?: string;
  created_at: string;
  updated_at: string;
  steps?: any[];
  liveUrl?: string;
  live_url?: string;
  finished_at?: string;
  output?: string;
  toolName?: string;
  args?: any;
}

type PartialTaskData = Partial<TaskData>;

interface ExtendedBrowserUseResultProps extends BrowserUseResultProps {
  toolCallId: string;
  toolInvocation: {
    result?: PartialTaskData;
    toolName?: string;
    args?: any;
  };
}

export default function BrowserUseResult({ toolCallId, toolInvocation, className }: ExtendedBrowserUseResultProps) {
  // States for media recordings
  const [mediaRecordings, setMediaRecordings] = useState<string[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isControlActionLoading, setIsControlActionLoading] = useState(false);
  
  // Original states
  const [data, setData] = useState<PartialTaskData | undefined>(toolInvocation.result);
  const [isPolling, setIsPolling] = useState(false);
  const [activeTab, setActiveTab] = useState<'results' | 'live' | 'steps' | 'media'>('steps');
  const [steps, setSteps] = useState<any[]>([]);
  const { getAccessToken } = usePrivy();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to safely update task data
  const updateTaskData = (newData: PartialTaskData) => {
    setData((prevState: PartialTaskData | undefined): PartialTaskData => {
      if (!prevState) return newData;
      return { ...prevState, ...newData };
    });
  };

  // Function to handle task status updates
  const handleTaskStatusUpdate = (newStatus: string) => {
    setData((prevState: PartialTaskData | undefined): PartialTaskData => {
      if (!prevState) return { status: newStatus };
      return { ...prevState, status: newStatus };
    });
  };

  // Function to safely check task status
  const checkTaskStatus = (status: string | undefined, validStatuses: string[]): boolean => {
    return Boolean(status && validStatuses.includes(status));
  };

  // Function to safely access taskId
  const getTaskId = () => data?.taskId ?? '';

  // Function to safely get tool name
  const getToolTitle = () => {
    const toolMap: Record<string, string> = {
      webResearch: "Web Research",
      tokenAnalysis: "Token Analysis",
      newTokenMonitor: "New Token Monitor",
      cryptoNews: "Crypto News Monitor",
      socialListening: "Social Media Analysis"
    };
    
    return toolInvocation.toolName && toolMap[toolInvocation.toolName] 
      ? toolMap[toolInvocation.toolName] 
      : "Browser Research";
  };

  // Effect to fetch media recordings
  useEffect(() => {
    const fetchMediaRecordings = async () => {
      const taskId = data?.taskId;
      const status = data?.status;
      
      if (!taskId || !status || !checkTaskStatus(status, ['finished', 'failed', 'stopped'])) {
        return;
      }
      
      setIsLoadingMedia(true);
      
      try {
        const accessToken = await getAccessToken();
        
        const response = await fetch(`/api/browser-use/media?taskId=${taskId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to get task media');
        }
        
        const mediaData = await response.json();
        
        if (mediaData.recordings && Array.isArray(mediaData.recordings)) {
          setMediaRecordings(mediaData.recordings);
        }
      } catch (error) {
        console.error('Error fetching media recordings:', error);
      } finally {
        setIsLoadingMedia(false);
      }
    };
    
    if (data?.status && checkTaskStatus(data.status, ['finished', 'failed', 'stopped'])) {
      fetchMediaRecordings();
    }
  }, [data?.taskId, data?.status, getAccessToken, activeTab]);

  // Function to stop a task
  const handleStopTask = async () => {
    if (!data?.taskId) return;
    
    try {
      setIsControlActionLoading(true);
      const accessToken = await getAccessToken();
      
      const response = await fetch(`/api/browser-use/stop-task?taskId=${data.taskId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to stop task');
      }
      
      handleTaskStatusUpdate('stopped');
      setIsPolling(false);
      
      if (typeof toast !== 'undefined') {
        toast.success('Task stopped successfully');
      }
    } catch (error) {
      console.error('Error stopping task:', error);
      if (typeof toast !== 'undefined') {
        toast.error('Failed to stop task');
      }
    } finally {
      setIsControlActionLoading(false);
    }
  };

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

        if (taskData.status === 'finished') {
          setActiveTab('results');
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
      
      // Then set interval - adjust interval based on status (slower when paused)
      const intervalTime = data?.status === 'paused' ? 20000 : 10000; // 20s for paused, 10s for running
      pollIntervalRef.current = setInterval(pollData, intervalTime);
      
      // Clean up when component unmounts or when isPolling changes
      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    }
  }, [isPolling, data?.taskId, data?.status, getAccessToken]);

  // Separate effect to determine when polling should start/stop
  useEffect(() => {
    if (!data) return;
    
    // Store the taskId in a ref to make sure we don't lose it
    if (data.taskId) {
      const taskIdRef = data.taskId;
      
      const shouldPoll = (data?.status === 'running' || data?.status === 'created' || data?.status === 'paused');
      
      if (shouldPoll && !isPolling) {
        setIsPolling(true);
      } else if (!shouldPoll && isPolling) {
        setIsPolling(false);
      }
    }
  }, [data, isPolling, data?.status]);

  // Function to pause a task
  const handlePauseTask = async () => {
    if (!data?.taskId) return;
    
    try {
      setIsControlActionLoading(true);
      const accessToken = await getAccessToken();
      
      const response = await fetch(`/api/browser-use/pause-task?taskId=${data.taskId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to pause task');
      }
      
      // Update local state immediately
      setData((prev) => prev ? {
        ...prev,
        status: 'paused'
      } : { status: 'paused' });
      
      // Continue polling to get updates (but at a reduced rate)
      
      // Show notification if toast is available
      if (typeof toast !== 'undefined') {
        toast.success('Task paused successfully');
      }
    } catch (error) {
      console.error('Error pausing task:', error);
      if (typeof toast !== 'undefined') {
        toast.error('Failed to pause task');
      }
    } finally {
      setIsControlActionLoading(false);
    }
  };

  // Function to resume a task
  const handleResumeTask = async () => {
    if (!data?.taskId) return;
    
    try {
      setIsControlActionLoading(true);
      const accessToken = await getAccessToken();
      
      const response = await fetch(`/api/browser-use/resume-task?taskId=${data.taskId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to resume task');
      }
      
      // Update local state immediately
      setData((prev) => prev ? {
        ...prev,
        status: 'running'
      } : { status: 'running' });
      
      // Ensure polling is active
      if (!isPolling) {
        setIsPolling(true);
      }
      
      // Show notification if toast is available
      if (typeof toast !== 'undefined') {
        toast.success('Task resumed successfully');
      }
    } catch (error) {
      console.error('Error resuming task:', error);
      if (typeof toast !== 'undefined') {
        toast.error('Failed to resume task');
      }
    } finally {
      setIsControlActionLoading(false);
    }
  };

  // Check if the live URL should be displayed
  const shouldShowLiveUrl = () => {
    return (data?.liveUrl || data?.live_url) && isLiveUrlValid(data?.finished_at);
  };

  // Determine subtitle based on args
  const getSubtitle = () => {
    const args = toolInvocation.args;
    if (!args) return '';
    
    switch (toolInvocation.toolName) {
      case 'webResearch':
        return `Research: ${args.query || ''}`;
      case 'tokenAnalysis':
        return `Analysis of ${args.tokenName || ''}`;
      case 'newTokenMonitor':
        return `Monitoring ${args.chain || 'all chains'} - ${args.timeframe || 'recent'}`;
      case 'cryptoNews':
        return args.topic ? `News about ${args.topic}` : 'Recent Crypto News';
      case 'socialListening':
        return `Social media analysis for ${args.token || ''}`;
      default:
        return '';
    }
  };

  // Format timestamp to local date/time
  const formatTimestamp = (timestamp: string | null | undefined) => {
    if (!timestamp) return 'N/A';
    try {
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      return timestamp;
    }
  };

  // Function to check if live URL is still valid (less than 5 minutes old)
  const isLiveUrlValid = (finishedAt: string | null | undefined) => {
    if (finishedAt == null) return true;
    
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

  if (!data) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2">
        <div className="text-white animate-pulse">Starting research...</div>
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

  const isRunning = ['created', 'running', 'paused'].includes(data.status || '');

  if (isRunning) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden my-2 text-white">
        {/* Header with integrated control buttons */}
        <div className="p-4 border-b border-zinc-700">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">{getToolTitle()}</h3>
              <div className="flex items-center gap-3">
              {/* Control buttons */}
              <div className="flex items-center gap-2">
                {/* Pause/Resume Button */}
                {data.status === 'paused' ? (
                  <button
                    onClick={handleResumeTask}
                    disabled={isControlActionLoading}
                    className="p-1.5 rounded bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300 transition-colors"
                    title="Resume task"
                  >
                    {isControlActionLoading ? (
                      <div className="animate-spin h-4 w-4 border-2 border-zinc-500 border-t-zinc-300 rounded-full"></div>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 5V19L19 12L8 5Z" fill="currentColor" />
                      </svg>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handlePauseTask}
                    disabled={isControlActionLoading}
                    className="p-1.5 rounded bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300 transition-colors"
                    title="Pause task"
                  >
                    {isControlActionLoading ? (
                      <div className="animate-spin h-4 w-4 border-2 border-zinc-500 border-t-zinc-300 rounded-full"></div>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 4H6V20H10V4Z" fill="currentColor" />
                        <path d="M18 4H14V20H18V4Z" fill="currentColor" />
                      </svg>
                    )}
                  </button>
                )}
                
                {/* Stop Button */}
                <button
                  onClick={handleStopTask}
                  disabled={isControlActionLoading}
                  className="p-1.5 rounded bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  title="Stop task"
                >
                  {isControlActionLoading ? (
                    <div className="animate-spin h-4 w-4 border-2 border-zinc-500 border-t-zinc-300 rounded-full"></div>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="6" y="6" width="12" height="12" fill="currentColor" />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Status Badge */}
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                data.status === 'paused' ? 'bg-zinc-700 text-zinc-300' : 
                data.status === 'running' || data.status === 'created' ? 'bg-zinc-700 text-zinc-300 animate-pulse' :
                data.status === 'finished' ? 'bg-green-800 text-zinc-300' :
                data.status === 'failed' ? 'bg-zinc-800 text-red-300' :
                'bg-zinc-700 text-zinc-300'
              }`}>
                {data?.status ? (data.status.charAt(0).toUpperCase() + data.status.slice(1)) : 'Processing'}
              </div>
            </div>                
              </div>
              <div className="text-sm text-zinc-400 mt-1">{getSubtitle()}</div>
            </div>
            

          </div>
        </div>
        
        {/* Tabs for running task */}
        <div className="flex border-b border-zinc-700">
          <button
            className={`px-4 py-2 text-sm ${activeTab === 'steps' ? 'text-white border-b-2 border-indigo-500' : 'text-zinc-400'}`}
            onClick={() => setActiveTab('steps')}
          >
            Progress
          </button>
          {shouldShowLiveUrl() && (
            <button
              className={`px-4 py-2 text-sm ${activeTab === 'live' ? 'text-white border-b-2 border-indigo-500' : 'text-zinc-400'}`}
              onClick={() => setActiveTab('live')}
            >
              Live View
            </button>
          )}
        </div>
        
        {/* Progress content with subtle loading indicator */}
        {activeTab === 'steps' && (
          <div className="p-4">
            {data.status === 'paused' ? (
              <div className="flex items-center space-x-2 mb-4 text-zinc-400 text-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 4H6V20H10V4Z" fill="currentColor" />
                  <path d="M18 4H14V20H18V4Z" fill="currentColor" />
                </svg>
                <span>Task paused - press the resume button to continue</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 mb-4 text-zinc-400 text-sm animate-pulse">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-zinc-500 border-t-zinc-300"></div>
                <span>Running browser research...</span>
              </div>
            )}
            
            {steps.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {steps.map((step, index) => (
                  <div key={index} className="border border-zinc-700 rounded-md p-3 bg-zinc-800/50">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-sm">Step {step.step || index + 1}</span>
                      {index === steps.length - 1 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-300">
                          {data.status === 'paused' ? 'Paused' : 'Current'}
                        </span>)}
                    </div>
                    
                    {step.next_goal && (
                      <div className="text-sm">
                        <span className="text-zinc-400">Goal: </span>
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
              Task ID: {data.taskId || 'Unknown'}
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
            <div className="bg-zinc-800 text-zinc-300 p-4 rounded-md inline-block mb-2">
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
              className="mt-4 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-md text-sm"
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
          <div className="flex-1">
            <h3 className="text-lg font-medium">{getToolTitle()}</h3>
            <div className="text-sm text-zinc-400 mt-1">{getSubtitle()}</div>
          </div>
          
          <div className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-700 text-zinc-300">
            {data?.status ? (data.status.charAt(0).toUpperCase() + data.status.slice(1)) : 'Unknown'}
          </div>
        </div>
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
        
        {/* Show Media tab only if recordings are available */}
        {(mediaRecordings.length > 0) && (
          <button
            className={`px-4 py-2 text-sm ${activeTab === 'media' ? 'text-white border-b-2 border-indigo-500' : 'text-zinc-400'}`}
            onClick={() => setActiveTab('media')}
          >
            Recordings {mediaRecordings.length > 0 ? `(${mediaRecordings.length})` : ''}
          </button>
        )}
        
        {shouldShowLiveUrl() && (
          <button
            className={`px-4 py-2 text-sm ${activeTab === 'live' ? 'text-white border-b-2 border-indigo-500' : 'text-zinc-400'}`}
            onClick={() => setActiveTab('live')}
          >
            Live View
          </button>
        )}
      </div>
      
      {/* Results Content */}
      {activeTab === 'results' && (
        <div className="p-4">
          <div className="prose prose-invert max-w-none">
            <Markdown>{data.output || 'No output available'}</Markdown>
          </div>
          
          <div className="mt-4 pt-4 border-t border-zinc-700 text-xs text-zinc-500">
            <div className="flex justify-between">
              <span>Task ID: {data.taskId || 'Unknown'}</span>
              <span>Finished: {formatTimestamp(data.finished_at)}</span>
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
                  <span className="text-xs px-2 py-1 rounded-full bg-green-800 text-zinc-300">Completed</span>
                </div>
                
                {step.next_goal && (
                  <div className="text-sm">
                    <span className="text-zinc-400">Goal: </span>
                    <span>{step.next_goal}</span>
                  </div>
                )}
                
                {step.evaluation_previous_goal && (
                  <div className="text-xs text-zinc-400 mt-1 italic">
                    <div className="flex items-center gap-2">
                      <div>
                        <svg className="w-3 h-3 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>                      
                      </div>
                      <div>{step.evaluation_previous_goal}</div>
                    </div>
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
      
      {/* Media Content - New tab for recordings */}
      {activeTab === 'media' && (
        <div className="p-4">
          {isLoadingMedia ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-500 border-t-zinc-300"></div>
              <span className="ml-3 text-zinc-400">Loading recordings...</span>
            </div>
          ) : mediaRecordings.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-medium mb-3">Task Recordings</h3>
              
              {mediaRecordings.map((recordingUrl, index) => (
                <div key={index} className="border border-zinc-700 rounded-lg overflow-hidden">
                  <div className="bg-zinc-800 px-4 py-2 flex justify-between items-center">
                    <span className="font-medium">Recording {index + 1}</span>
                  </div>
                  
                  {/* Embedding the video */}
                  <div className="relative" style={{ paddingTop: '56.25%' }}> {/* 16:9 aspect ratio */}
                    <video 
                      className="absolute top-0 left-0 w-full h-full"
                      controls
                      preload="metadata"
                    >
                      <source src={recordingUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🎬</div>
              <h3 className="text-xl font-medium mb-2">No recordings available</h3>
              <p className="text-zinc-400 text-sm">
                No recordings were generated for this task.
                <br />
                Recordings are typically available for longer tasks.
              </p>
            </div>
          )}
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
          <div className="bg-zinc-800 text-zinc-300 p-4 rounded-md inline-block mb-2">
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
            className="mt-4 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-md text-sm"
          >
            View Results
          </button>
        </div>
      )}
    </div>
  );
}