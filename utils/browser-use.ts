// utils/browser-use.ts
import { z } from 'zod';

const API_KEY = process.env.BROWSER_USE_API_KEY;
const BASE_URL = 'https://api.browser-use.com/api/v1';

// Constants for request headers
const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
};

/**
 * Create a new browser automation task
 * @param {string} instructions - The task instructions
 * @returns {Promise<string>} - Task ID
 */
export async function createTask(instructions: string) {
  const response = await fetch(`${BASE_URL}/run-task`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ task: instructions }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create task: ${response.status}`);
  }
  
  const data = await response.json();
  return data;
}

/**
 * Get current task status
 * @param {string} taskId - The task ID
 * @returns {Promise<Object>} - Status object
 */
export async function getTaskStatus(taskId: string) {
    const response = await fetch(`${BASE_URL}/task/${taskId}/status`, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get task status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Ensure we always return both status and steps
    return {
      status: data.status || 'running',
      steps: data.steps || []
    };
  }
  
/**
 * Get full task details including output
 * @param {string} taskId - The task ID
 * @returns {Promise<Object>} - Task details
 */
export async function getTaskDetails(taskId: string) {
  const response = await fetch(`${BASE_URL}/task/${taskId}`, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get task details: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Pause a running task
 * @param {string} taskId - The task ID
 * @returns {Promise<Object>} - Response data
 */
export async function pauseTask(taskId: string) {
  const response = await fetch(`${BASE_URL}/pause-task?task_id=${taskId}`, {
    method: 'PUT',
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to pause task: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Resume a paused task
 * @param {string} taskId - The task ID
 * @returns {Promise<Object>} - Response data
 */
export async function resumeTask(taskId: string) {
  const response = await fetch(`${BASE_URL}/resume-task?task_id=${taskId}`, {
    method: 'PUT',
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to resume task: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Stop a task
 * @param {string} taskId - The task ID
 * @returns {Promise<Object>} - Response data
 */
export async function stopTask(taskId: string) {
  const response = await fetch(`${BASE_URL}/stop-task?task_id=${taskId}`, {
    method: 'PUT',
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to stop task: ${response.status}`);
  }
  
  return response.json();
}

// Get task media (screenshots, video) for a given task
export async function getTaskMedia(taskId: string) {
  const response = await fetch(`${BASE_URL}/task/${taskId}/media`, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get task media: ${response.status}`);
  }
  
  const data = await response.json();
  return data;
}

// Helper function to wait for task completion with polling
export async function waitForTaskCompletion(taskId: string, timeoutMs = 300000, intervalMs = 5000) {
    const startTime = Date.now();
    let lastStepCount = 0;
    
    while (Date.now() - startTime < timeoutMs) {
      const details = await getTaskDetails(taskId);
      
      // Track if we've received new steps (helpful for the UI to know if things are progressing)
      const currentStepCount = details.steps?.length || 0;
      const hasNewSteps = currentStepCount > lastStepCount;
      lastStepCount = currentStepCount;
      
      // If task is complete, return the results
      if (['finished', 'failed', 'stopped'].includes(details.status)) {
        return details;
      }
      
      // Return early with what we have if it's taking too long
      if (Date.now() - startTime > 120000 && details.output) {
        // If we have some output after 2 minutes, return it with the status
        return {
          ...details,
          status: 'partial_results'
        };
      }
      
      // Use a shorter polling interval if we're seeing new steps (showing progress)
      const dynamicInterval = hasNewSteps ? Math.min(intervalMs, 3000) : intervalMs;
      
      // Wait for the specified interval before polling again
      await new Promise(resolve => setTimeout(resolve, dynamicInterval));
    }
    
    throw new Error('Task execution timed out');
  }

  