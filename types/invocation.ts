export type ToolInvocationState = 'result' | 'partial-call' | 'call';

export interface BaseToolInvocation {
  id: string;
  type: string;
  state: ToolInvocationState;
  result?: any;
}

export interface ResultToolInvocation extends BaseToolInvocation {
  state: 'result';
  result: any;
}

export interface PartialCallToolInvocation extends BaseToolInvocation {
  state: 'partial-call';
  result?: any;
}

export type ToolInvocationResult = ResultToolInvocation | PartialCallToolInvocation;

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  toolInvocations?: ToolInvocation[];
}

export interface ToolInvocation {
  id: string;
  toolName: string;
  args: Record<string, any>;
  result?: any;
  state: ToolInvocationState;
}

export interface UpdateToolInvocationParams {
  id: string;
  state: ToolInvocationState;
  result?: any;
}

export interface SwapToolResult {
  fromToken: string;
  toToken: string;
  amount: number;
  expectedOutput: number;
}

export interface SwapToolInvocation extends BaseToolInvocation {
  result?: SwapToolResult;
} 