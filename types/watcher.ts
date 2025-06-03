export interface LastActivityWrapper {
  userId: string;
  timestamp: number;
  sk: string;
  pk: string;
  walletAddress: string;
  type: string;
}

export interface TrackingFilters {
  minAmount?: number;
  specificToken?: string;
  platform?: string[];
  activityTypes?: string[];
  sort_by?: string;
  sort_order?: string;
}

export interface WatcherData {
  walletAddress: string;
  userId: string;
  createdAt: string;
  isActive: boolean;
  sk: string;
  pk: string;
  type: string;
  lastChecked?: string | null | undefined;
  name?: string;
  tags?: string[];
  lastDataPoint?: {
    solBalance: number;
    timestamp: number;
  };
  lastActivity?: LastActivityWrapper[];
  filters?: TrackingFilters;
  lastReadTimestamp?: number;
  hasUnreadActivities?: boolean;
}

export interface WatchersResponse {
  watchers: WatcherData[];
}

export interface WatcherCardProps {
  watcher: WatcherData;
  onDelete: (e: React.MouseEvent) => void;
  onClick: () => void;
} 