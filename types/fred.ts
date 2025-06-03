import { BaseToolProps, ToolInvocationState } from './tools';

export interface FredSeries {
  id: string;
  title: string;
  frequency: string;
  units: string;
  seasonal_adjustment: string;
  notes: string;
  last_updated: string;
  observation_start: string;
  observation_end: string;
  realtime_start: string;
  realtime_end: string;
}

export interface FredMetadata {
  id: string;
  title: string;
  frequency: string;
  frequency_short?: string;
  units: string;
  units_short?: string;
  seasonal_adjustment: string;
  seasonal_adjustment_short?: string;
  last_updated: string;
  popularity: number;
  notes?: string;
}

export interface FredObservation {
  date: string;
  value: string;
  realtime_start: string;
  realtime_end: string;
}

export interface FredSearchResult {
  series: Array<{
    id: string;
    title: string;
    observation_start: string;
    observation_end: string;
    frequency: string;
    units: string;
    notes?: string;
  }>;
  count: number;
}

export interface FredDataPoint {
  date: string;
  value: number;
}

export interface FredSeriesData {
  id: string;
  title: string;
  data: FredDataPoint[];
  metadata: FredMetadata;
}

export interface FredSearchProps {
  toolCallId: string;
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    result?: FredSearchResult;
  };
  onShowChart: (seriesId: string) => void;
}

export interface FredAnalysis {
  series: FredSeries;
  metadata: FredMetadata;
  observations: FredObservation[];
  summary: {
    mean: number;
    median: number;
    min: number;
    max: number;
    stdDev: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    seasonality: boolean;
    lastValue: number;
    lastValueChange: number;
    lastValueChangePercent: number;
  };
  correlations?: {
    seriesId: string;
    correlation: number;
  }[];
}

export interface FredError {
  error_code: number;
  error_message: string;
  error_details?: string;
}

export interface FredAnalysisProps extends BaseToolProps {
  series: string;
  onAnalysisUpdate?: (analysis: any) => void;
  className?: string;
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    result?: {
      data: Observation[];
      metadata: FredMetadata;
      seriesId: string;
      title: string;
      observations: Observation[];
      _storedInS3?: boolean;
      _s3Reference?: {
        bucket: string;
        key: string;
      };
    };
    state: ToolInvocationState;
  };
}

export interface Observation {
  date: string;
  value: number;
} 