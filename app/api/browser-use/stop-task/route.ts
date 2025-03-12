// app/api/browser-use/stop-task/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stopTask } from '@/utils/browser-use';

export async function PUT(req: NextRequest) {
  try {
    // Get task ID from query parameters
    const url = new URL(req.url);
    const taskId = url.searchParams.get('taskId');
    
    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }
    
    // Check authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Stop the task
    const result = await stopTask(taskId);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error stopping task:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to stop task' },
      { status: 500 }
    );
  }
}

