// app/api/browser-use/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTaskDetails, getTaskStatus } from '@/utils/browser-use';

export async function GET(req: NextRequest) {
  try {
    // Get task ID from query parameters
    const url = new URL(req.url);
    const taskId = url.searchParams.get('taskId');
    const includeStepsOnly = url.searchParams.get('stepsOnly') === 'true';
    
    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }
    
    // Check authorization (implement your own auth logic)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // If we only need steps (for lightweight polling), use the status endpoint
    if (includeStepsOnly) {
        try {
        const statusDetails = await getTaskStatus(taskId);
        
        // Just return the task status and steps for efficiency
        // IMPORTANT: Always include status in the response
        return NextResponse.json({
            taskId,
            status: statusDetails.status || 'running', // Provide fallback status
            steps: statusDetails.steps || []
        });
        } catch (error) {
        // Fall back to the full details if the step-only request fails
        console.warn('Failed to get steps-only data, falling back to full details', error);
        }
    }
        
    // Get full task details from Browser Use API
    const taskDetails = await getTaskDetails(taskId);
    
    // Add some additional analytics data
    const enhancedResponse = {
      ...taskDetails,
      analytics: {
        stepCount: taskDetails.steps?.length || 0,
        executionTime: taskDetails.finished_at ? 
          (new Date(taskDetails.finished_at).getTime() - new Date(taskDetails.created_at).getTime()) / 1000 : // in seconds
          (Date.now() - new Date(taskDetails.created_at).getTime()) / 1000, // current execution time
        hasOutput: Boolean(taskDetails.output),
        status: taskDetails.status
      }
    };
    
    return NextResponse.json(enhancedResponse);
  } catch (error: any) {
    console.error('Error fetching task status:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to get task status' },
      { status: 500 }
    );
  }
}