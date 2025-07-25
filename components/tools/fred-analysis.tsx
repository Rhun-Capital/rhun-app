import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Group } from '@visx/group';
import { LinePath } from '@visx/shape';
import { scaleTime, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { ParentSize } from '@visx/responsive';
import { GridRows, GridColumns } from '@visx/grid';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { bisector } from 'd3-array';
import axios from 'axios';
import { Maximize, Minimize } from 'lucide-react';
import LoadingIndicator from '../loading-indicator';
import { BaseToolProps } from '@/types/tools';
import type { FredMetadata, Observation } from '@/types/fred';

interface FredAnalysisProps extends BaseToolProps {
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    result?: {
      seriesId: string;
      observations: Array<{
        date: string;
        value: number;
      }>;
      metadata?: {
        units?: string;
        title?: string;
      };
      _storedInS3?: boolean;
      _s3Reference?: {
        bucket: string;
        key: string;
      };
    };
    state: 'result' | 'partial-call' | 'call';
  };
}

// Helper to get closest data point for tooltip
const bisectDate = bisector((d: any) => new Date(d.date)).left;

// Common FRED series names
const seriesNames: Record<string, string> = {
  'GDP': 'Gross Domestic Product',
  'UNRATE': 'Unemployment Rate',
  'CPIAUCSL': 'Consumer Price Index for All Urban Consumers',
  'FEDFUNDS': 'Federal Funds Effective Rate',
  'GS10': '10-Year Treasury Constant Maturity Rate',
  'SP500': 'S&P 500 Index',
  'DEXUSEU': 'U.S. / Euro Foreign Exchange Rate',
  'PCE': 'Personal Consumption Expenditures',
  'HOUST': 'Housing Starts',
  'INDPRO': 'Industrial Production Index',
  'PAYEMS': 'All Employees, Total Nonfarm',
  'UMCSENT': 'University of Michigan: Consumer Sentiment',
  'DGS10': '10-Year Treasury Yield',
  'VIXCLS': 'CBOE Volatility Index (VIX)',
  'M2SL': 'M2 Money Supply',
  'MORTGAGE30US': '30-Year Fixed Rate Mortgage Average',
  'DEXJPUS': 'Japanese Yen to U.S. Dollar Exchange Rate',
  'DEXCAUS': 'Canadian Dollar to U.S. Dollar Exchange Rate',
  'GFDEBTN': 'Federal Debt: Total Public Debt',
  'RSAFS': 'Advance Retail Sales',
  'CPILFESL': 'Core Consumer Price Index (excluding Food and Energy)',
  'RRSFS': 'Retail Sales',
  'EMRATIO': 'Employment-Population Ratio'
};

export default function FredAnalysis({ toolInvocation }: FredAnalysisProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [completeData, setCompleteData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [additionalMetadata, setAdditionalMetadata] = useState<FredMetadata | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [timeframe, setTimeframe] = useState<'1Y' | '5Y' | '10Y' | 'MAX'>('10Y');
  const [isLoadingFullData, setIsLoadingFullData] = useState(false);
  const [fullData, setFullData] = useState<any>(null);

  // Fetch complete data from S3 if stored there
  useEffect(() => {
    async function fetchCompleteData() {
      if (!toolInvocation?.result?._storedInS3) return;
      
      const s3Reference = toolInvocation.result._s3Reference;
      if (!s3Reference?.bucket || !s3Reference?.key) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Get presigned URL
        const response = await axios.get(`/api/chat/messages?bucket=${s3Reference.bucket}&key=${s3Reference.key}`);
        
        if (response.data?.url) {
          // Fetch the actual data using the presigned URL
          const dataResponse = await axios.get(response.data.url);
          if (dataResponse.data) {
            setCompleteData(dataResponse.data);
          }
        }
      } catch (err) {
        console.error('Error fetching complete data:', err);
        setError('Failed to load complete data. Using preview data instead.');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchCompleteData();
  }, [toolInvocation]);

  // Fullscreen toggle handler
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(err => console.error(`Fullscreen error: ${err.message}`));
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => setIsFullscreen(false))
          .catch(err => console.error(`Exit fullscreen error: ${err.message}`));
      }
    }
  }, []);

  // Listen for fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Function to fetch full data
  const fetchFullData = async () => {
    if (!toolInvocation?.result?.seriesId) return;
    
    setIsLoadingFullData(true);
    try {
      const response = await fetch(`/api/fred/series/${toolInvocation.result.seriesId}?full=true`);
      if (!response.ok) throw new Error('Failed to fetch full data');
      const data = await response.json();
      setFullData(data);
    } catch (error) {
      console.error('Error fetching full data:', error);
    } finally {
      setIsLoadingFullData(false);
    }
  };

  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe: '1Y' | '5Y' | '10Y' | 'MAX') => {
    setTimeframe(newTimeframe);
    if (newTimeframe === 'MAX') {
      fetchFullData();
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2 text-white">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          <span className="ml-3">Loading complete data from storage...</span>
        </div>
      </div>
    );
  }

  if (!toolInvocation?.result) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2">
        <div className="text-zinc-400">Loading FRED data...</div>
      </div>
    );
  }

  // Determine which data to use - complete data from S3 or the preview data
  const dataToUse = timeframe === 'MAX' && fullData ? fullData : (completeData || toolInvocation.result);
  
  const { observations: rawObservations, metadata, seriesId, title } = dataToUse;
  
  if (!rawObservations) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2">
        <div className="text-zinc-400">No FRED data available</div>
      </div>
    );
  }
  
  // Check if we're using preview data and full data is available
  const isUsingPreview = toolInvocation.result._storedInS3 && !completeData;
  
  // Filter out observations with non-numeric values and parse numeric values
  const observations = rawObservations
    .filter((obs: any) => obs.value !== '.' && !isNaN(parseFloat(obs.value)))
    .map((obs: any) => ({
      date: obs.date,
      value: parseFloat(obs.value)
    }));

  if (!observations || observations.length === 0) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2">
        <div className="text-zinc-400">No valid observations available</div>
      </div>
    );
  }

  // Filter observations based on selected timeframe
  const filterObservationsByTimeframe = (allObservations: Observation[]) => {
    if (allObservations.length === 0) {
      return allObservations;
    }
    
    const now = new Date();
    const cutoffDate = new Date();
    
    if (timeframe === '1Y') {
      cutoffDate.setFullYear(now.getFullYear() - 1);
    } else if (timeframe === '5Y') {
      cutoffDate.setFullYear(now.getFullYear() - 5);
    } else if (timeframe === '10Y') {
      cutoffDate.setFullYear(now.getFullYear() - 10);
    } else if (timeframe === 'MAX') {
      // For MAX timeframe, use all available data
      return allObservations;
    }
    
    return allObservations.filter(obs => new Date(obs.date) >= cutoffDate);
  };

  // Find the latest observation with a valid value
  const latestObservation = observations[observations.length - 1];
  const previousObservation = observations.length > 1 ? observations[observations.length - 2] : null;
  
  // Calculate change and percent change
  const change = previousObservation ? (latestObservation.value - previousObservation.value) : 0;
  const percentChange = previousObservation ? (change / previousObservation.value) * 100 : 0;

  // Get units from metadata or default to empty string
  const unitsLabel = metadata?.units || '';
  
  
  // Determine if we're dealing with percentages
  // Be more inclusive in percentage detection
  const isPercentage = unitsLabel.toLowerCase().includes('percent') || 
                       seriesId === 'UNRATE' || 
                       (observations.length > 0 && observations[0].value >= 0 && observations[0].value <= 100 && 
                        unitsLabel.toLowerCase().includes('rate'));
  
  
  // Filter observations based on timeframe
  const filteredObservations = filterObservationsByTimeframe(observations);
  
  // Format value based on type
  const formatValueForCard = (value: number) => {
    if (isPercentage) {
      return `${value.toFixed(1)}%`;
    } else if (unitsLabel.toLowerCase().includes('dollar')) {
      // Dollar formatting
      const trillionAmount = value / 1000;
      if (trillionAmount >= 1) {
        return <>${trillionAmount.toFixed(2)}T</>;
      }
      return <>${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}</>;
    } else if (unitsLabel) {
      // For units like 'Thousands of Persons', use a line break
      return (
        <>
          {value.toLocaleString('en-US', { maximumFractionDigits: unitsLabel.toLowerCase().includes('thousands of persons') ? 0 : 2 })}
          <br />
          <span className="text-xs text-zinc-400">{unitsLabel}</span>
        </>
      );
    } else {
      return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }
  };

  // Function to format change values
  const formatChange = (changeValue: number) => {
    if (isPercentage) {
      return `${changeValue.toFixed(1)} pts`;
    } else {
      return changeValue.toFixed(2);
    }
  };
  
  // Get Y-axis label based on units
  const getYAxisLabel = () => {
    
    // Use the actual units from the metadata
    if (unitsLabel && unitsLabel.trim() !== '') {
      return unitsLabel;
    } else if (isPercentage) {
      return "Percent";
    } else {
      return "Value";
    }
  };
  
  // Prepare data for chart with actual values - no conversion
  const chartData = filteredObservations.map((obs: Observation) => ({
    date: obs.date,
    value: obs.value
  }));

  // Chart dimensions - adjust height for fullscreen
  const baseHeight = 400;
  const height = isFullscreen ? window.innerHeight - 250 : baseHeight;
  const margin = { 
    top: 30, 
    right: 30, 
    bottom: 60, 
    left: isFullscreen ? 100 : 70 
  };

  // Create responsive chart component
  const Chart = ({ width }: { width: number }) => {
    // Setup tooltip
    const {
      tooltipData,
      tooltipLeft,
      tooltipTop,
      tooltipOpen,
      showTooltip,
      hideTooltip
    } = useTooltip<Observation>();

    // Helper function to get the data point associated with a mouse position
    const getTooltipData = (event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>) => {
      const { x } = localPoint(event) || { x: 0 };
      const x0 = xScale.invert(x);
      const index = bisectDate(chartData, x0, 1);
      const d0 = chartData[index - 1];
      const d1 = chartData[index];
      
      if (!d0 || !d1) return d0 || d1;
      
      const d = x0.valueOf() - new Date(d0.date).valueOf() > new Date(d1.date).valueOf() - x0.valueOf() ? d1 : d0;
      return d;
    };

    // Prepare data for chart with dynamic width
    const xScale = scaleTime({
      domain: [
        new Date(chartData[0].date),
        new Date(chartData[chartData.length - 1].date)
      ],
      range: [margin.left, width - margin.right],
    });

    const yScale = scaleLinear({
      domain: [
        Math.min(...chartData.map((d: Observation) => d.value)) * 0.95,
        Math.max(...chartData.map((d: Observation) => d.value)) * 1.05
      ],
      range: [height - margin.bottom, margin.top],
    });

    return (
      <>
        <svg width={width} height={height}>
          <rect
            width={width}
            height={height}
            fill="transparent"
            onTouchStart={(event) => {
              const data = getTooltipData(event);
              if (data) {
                showTooltip({
                  tooltipData: data,
                  tooltipLeft: xScale(new Date(data.date)),
                  tooltipTop: yScale(data.value),
                });
              }
            }}
            onTouchMove={(event) => {
              const data = getTooltipData(event);
              if (data) {
                showTooltip({
                  tooltipData: data,
                  tooltipLeft: xScale(new Date(data.date)),
                  tooltipTop: yScale(data.value),
                });
              }
            }}
            onMouseMove={(event) => {
              const data = getTooltipData(event);
              if (data) {
                showTooltip({
                  tooltipData: data,
                  tooltipLeft: xScale(new Date(data.date)),
                  tooltipTop: yScale(data.value),
                });
              }
            }}
            onMouseLeave={() => hideTooltip()}
          />
          
          <Group>
            {/* Add grid lines */}
            <GridRows 
              scale={yScale} 
              width={width - margin.left - margin.right} 
              left={margin.left}
              stroke="#374151"
              strokeOpacity={0.2}
              strokeDasharray="3,3"
            />
            <GridColumns 
              scale={xScale} 
              height={height - margin.top - margin.bottom} 
              top={margin.top}
              stroke="#374151"
              strokeOpacity={0.2}
              strokeDasharray="3,3"
            />
          
            <LinePath
              data={chartData}
              x={(d: Observation) => xScale(new Date(d.date))}
              y={(d: Observation) => yScale(d.value)}
              stroke="#6366f1"
              strokeWidth={2}
            />
            
            <AxisBottom
              scale={xScale}
              top={height - margin.bottom}
              stroke="#4b5563"
              tickStroke="#4b5563"
              tickLabelProps={() => ({
                fill: '#9ca3af',
                fontSize: 12,
                textAnchor: 'middle',
              })}
              numTicks={timeframe === '1Y' ? 6 : timeframe === '5Y' ? 5 : 10}
              tickFormat={(value) => {
                const date = new Date(Number(value));
                
                if (timeframe === '1Y') {
                  // For 1-year timeframe, use short month names only
                  return date.toLocaleDateString(undefined, { month: 'short' });
                } else if (timeframe === '5Y') {
                  // For 5-year timeframe, use just the year
                  return date.getFullYear().toString();
                } else {
                  // For 10Y and MAX, just show the year
                  return date.getFullYear().toString();
                }
              }}
              label="Date"
              labelProps={{
                fill: '#9ca3af',
                fontSize: 14,
                textAnchor: 'middle',
                y: 45
              }}
            />
            
            <AxisLeft
              scale={yScale}
              left={margin.left}
              stroke="#4b5563"
              tickStroke="#4b5563"
              tickLabelProps={() => ({
                fill: '#9ca3af',
                fontSize: 12,
                textAnchor: 'end',
                dx: -5
              })}
              label={getYAxisLabel()}
              labelProps={{
                fill: '#9ca3af',
                fontSize: 14,
                textAnchor: 'middle',
                transform: 'rotate(-90)',
                x: -height/2,
                y: 15
              }}
            />
            
            {tooltipData && (
              <circle
                cx={xScale(new Date(tooltipData.date))}
                cy={yScale(tooltipData.value)}
                r={5}
                fill="#6366f1"
                stroke="white"
                strokeWidth={2}
                pointerEvents="none"
              />
            )}
          </Group>
        </svg>
        
        {tooltipOpen && tooltipData && tooltipLeft != null && tooltipTop != null && (
          <TooltipWithBounds
            key={Math.random()} // force re-render for position
            top={tooltipTop - 40}
            left={tooltipLeft + 10}
            style={{
              ...defaultStyles,
              backgroundColor: 'rgba(30, 30, 30, 0.9)',
              color: 'white',
              border: '1px solid #6366f1',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              padding: '8px 12px',
              fontSize: '14px',
              borderRadius: '4px',
            }}
          >
            <div>
              <strong>Date:</strong> {new Date(tooltipData.date).toLocaleDateString()}
            </div>
            <div>
              <strong>Value:</strong> {isPercentage 
                ? `${tooltipData.value.toFixed(1)}%` 
                : unitsLabel.toLowerCase().includes('dollar')
                  ? (
                      <div className="flex flex-col">
                        <span>${tooltipData.value.toFixed(2)}</span>
                        {tooltipData.value >= 1000 && (
                          <span className="text-sm text-zinc-400">
                            ({(tooltipData.value / 1000).toFixed(2)}T)
                          </span>
                        )}
                      </div>
                    )
                  : tooltipData.value.toFixed(2)
              }
            </div>
          </TooltipWithBounds>
        )}
      </>
    );
  };

  // Get the most appropriate title to display
  const displayTitle = seriesNames[seriesId] || seriesId || 'FRED Data Analysis';

  return (
    <div 
      ref={containerRef} 
      className={`relative bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2 ${isFullscreen ? 'w-screen h-screen' : ''}`}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
        <div className="w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white">{seriesId}</h3>
            <div className="group relative inline-block">
              <div className="text-zinc-400 cursor-help">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              </div>
              <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity bg-zinc-900 text-sm text-zinc-200 rounded-lg p-3 absolute left-0 top-full mt-2 w-64 shadow-lg border border-zinc-700 z-[100]">
                <div className="space-y-2">
                  <p><span className="font-semibold">Frequency:</span> {additionalMetadata?.frequency_short || metadata?.frequency || 'N/A'}</p>
                  <p><span className="font-semibold">Units:</span> {additionalMetadata?.units || metadata?.units || 'N/A'}</p>
                  <p><span className="font-semibold">Seasonal Adjustment:</span> {additionalMetadata?.seasonal_adjustment_short || metadata?.seasonal_adjustment || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="text-sm text-zinc-400 mt-1">{displayTitle}</div>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
          <div className="hidden sm:flex items-center gap-1 mr-2 relative z-0">
            <div className="flex rounded-md overflow-hidden">
              {(['1Y', '5Y', '10Y', 'MAX'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => handleTimeframeChange(tf)}
                  className={`px-2 py-1 text-xs ${
                    timeframe === tf
                      ? 'bg-indigo-600/20 text-indigo-300 border-2 border-indigo-500 z-0'
                      : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600 border-2 border-zinc-700'
                  } ${tf !== '1Y' ? '-ml-[2px]' : ''}`}
                  disabled={tf === 'MAX' && isLoadingFullData}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
          <button 
            onClick={toggleFullscreen}
            className="hidden sm:flex p-2 rounded-md bg-zinc-700 hover:bg-zinc-600 text-sm items-center gap-1"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-4 h-4" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize className="w-4 h-4" />
                <span>Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isUsingPreview && (
        <div className="mb-4 p-2 bg-blue-900/30 border border-blue-700/50 rounded text-blue-200 text-sm">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>
              Showing preview data. {error || "Complete data will be available on your next visit."}
            </span>
          </div>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
          <div className="text-sm text-zinc-400">Latest Value</div>
          <div className="text-xl font-semibold text-white">
            {formatValueForCard(latestObservation.value)}
          </div>
        </div>
        <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
          <div className="text-sm text-zinc-400">Change</div>
          <div className={`text-xl font-semibold ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatValueForCard(change)}
          </div>
        </div>
        <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
          <div className="text-sm text-zinc-400">% Change</div>
          <div className={`text-xl font-semibold ${percentChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {percentChange.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="sm:hidden mb-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
        <div className="flex flex-col items-center gap-2 text-zinc-400 text-center">
          <span className="text-sm">View chart on desktop for better visualization</span>
        </div>
      </div>

      {/* Desktop Chart View */}
      <div 
        className="hidden sm:block w-full relative" 
        style={{ height: `${height}px`, transition: 'height 0.3s ease-in-out' }}
      >
        {isLoadingFullData && (
          <div className="absolute inset-0 bg-zinc-800/50 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <LoadingIndicator />
              <span className="text-zinc-300 text-sm">Loading...</span>
            </div>
          </div>
        )}
        <ParentSize>
          {({ width }) => <Chart width={width} />}
        </ParentSize>
      </div>

      <div className="mt-4">
        <h4 className="text-lg font-semibold mb-2">Recent Data Points</h4>
        <div className="overflow-x-auto">
          <div className="max-h-[200px] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-zinc-800 z-0">
                <tr className="text-left border-b border-zinc-700">
                  <th className="py-2 text-white">Date</th>
                  <th className="py-2 text-white">{getYAxisLabel()}</th>
                </tr>
              </thead>
              <tbody>
                {filteredObservations.slice(-10).reverse().map((obs: Observation, index: number) => (
                  <tr key={index} className="border-b border-zinc-700">
                    <td className="py-2 text-white">{new Date(obs.date).toLocaleDateString()}</td>
                    <td className="py-2 text-white">
                      {formatValueForCard(obs.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="text-xs text-zinc-500 mt-4 text-center">
        Source: Federal Reserve Economic Data (FRED) | Last updated: {new Date().toLocaleString()}
      </div>

      <style jsx>{`
        .fullscreen-container {
          margin: 0 !important;
          border-radius: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          display: flex;
          flex-direction: column;
        }
        .fullscreen-container > div:last-child {
          margin-top: auto;
        }
      `}</style>
    </div>
  );
} 