import { NextResponse } from 'next/server';
import { getAgentConfig } from '@/utils/agent-tools';

export async function GET(
  request: Request,
  { params }: { params: { userId: string, agentId: string } }
) {
  try {
    const item = await getAgentConfig(params.userId, params.agentId);
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
}