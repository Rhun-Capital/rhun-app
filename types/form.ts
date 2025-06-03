export interface AgentFormData {
  name: string;
  userId?: string;
  description: string;
  image?: string | null;
  imageUrl?: string | null;
  category?: string;
  prompt?: string;
  tools?: string[];
  isPublic?: boolean;
  coreCapabilities: string;
  interactionStyle: string;
  analysisApproach: string;
  riskCommunication: string;
  responseFormat: string;
  limitationsDisclaimers: string;
  prohibitedBehaviors: string;
  knowledgeUpdates: string;
  specialInstructions: string;
  responsePriorityOrder: string;
  styleGuide: string;
  createdAt?: string;
  updatedAt?: string;
}

export type AgentFormDataKeys = keyof AgentFormData;

export interface AttributeMap {
  [key: string]: {
    name: string;
    description: string;
    type: string;
    required: boolean;
    default?: any;
  };
}

export interface TrackingFilters {
  minAmount?: number;
  maxAmount?: number;
  minValue?: number;
  maxValue?: number;
  fromAddresses?: string[];
  toAddresses?: string[];
  tokenAddresses?: string[];
  eventTypes?: string[];
}

export type FilterType = 'all' | 'templates' | 'custom'; 