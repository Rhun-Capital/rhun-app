export interface InitialData {
  id: string;
  userId: string;
  name: string;
  description: string;
  coreCapabilities: string;
  interactionStyle: string;
  analysisApproach: string;
  riskCommunication: string;
  responseFormat: string;
  limitationsDisclaimers: string;
  prohibitedBehaviors: string;
  knowledgeUpdates: string;
  responsePriorityOrder: string;
  styleGuide: string;
  specialInstructions: string;
  imageUrl?: string;
}

export interface AgentFormProps {
  initialData?: AgentAttributes | null;
  onSubmit?: (data: AgentAttributes) => void;
  onCancel?: () => void;
  className?: string;
}

export interface ImageState {
  file: File | null;
  preview: string | null;
}

export interface TextAreaField {
  name: keyof InitialData;
  label: string;
  rows?: number;
  required?: boolean;
  placeholder: string;
}

export interface Agent {
  id: string;
  userId: string;
  name: string;
  description: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  isTemplate?: boolean;
  model?: string;
  configuration: Omit<InitialData, 'id' | 'userId' | 'name' | 'description' | 'imageUrl'>;
}

export type AttributeMap = {
  [key: string]: string | number | boolean | null;
};

export type FilterType = 'all' | 'templates' | 'custom';

export interface AgentConfig {
  name: string;
  description: string;
  image?: string;
  type: string;
  metadata?: Record<string, any>;
}

export interface AgentResponse {
  success: boolean;
  data?: Agent;
  error?: {
    code: string;
    message: string;
  };
}

export interface AgentListResponse {
  success: boolean;
  data?: {
    agents: Agent[];
    total: number;
    hasMore: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface AgentFilter {
  type?: string;
  status?: 'active' | 'inactive';
  search?: string;
  sort?: 'name' | 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
}

export interface AgentAttributes {
  id?: string;
  userId?: string;
  name: string;
  description: string;
  imageUrl?: string;
  isTemplate?: boolean;
  updatedAt?: string;
  coreCapabilities: string;
  interactionStyle: string;
  analysisApproach: string;
  riskCommunication: string;
  responseFormat: string;
  limitationsDisclaimers: string;
  prohibitedBehaviors: string;
  knowledgeUpdates: string;
  styleGuide: string;
  specialInstructions: string;
  responsePriorityOrder: string;
} 