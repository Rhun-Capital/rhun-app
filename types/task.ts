import { BaseToolProps } from './tools';

export interface TaskData {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  type: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  result?: any;
  error?: string;
  progress?: number;
  startTime?: string;
  endTime?: string;
  metadata?: Record<string, any>;
}

export type PartialTaskData = Partial<TaskData>;

export interface AttributeMap {
  [key: string]: {
    name: string;
    description: string;
    type: string;
    required: boolean;
    default?: any;
  };
}

export interface TaskProps {
  task: TaskData;
  onUpdate?: (task: TaskData) => void;
  onDelete?: (taskId: string) => void;
  className?: string;
}

export interface ExtendedBrowserUseResultProps extends BaseToolProps {
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    result?: TaskData;
    state: 'result' | 'partial-call' | 'call';
  };
} 