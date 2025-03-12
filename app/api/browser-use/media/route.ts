// app/api/browser-use/media/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTaskMedia } from '@/utils/browser-use';

export async function GET(req: NextRequest) {
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
    
    // Check authorization (implement your own auth logic)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get media from Browser Use API
    try {
      const mediaData = await getTaskMedia(taskId);
      return NextResponse.json(mediaData);
    } catch (error: any) {
      // Special case for when media isn't available yet
      if (error.message.includes('404')) {
        return NextResponse.json({ recordings: [] });
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error fetching task media:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to get task media' },
      { status: 500 }
    );
  }
}