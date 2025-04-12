'use client';

import { ToolInvocation } from '@ai-sdk/ui-utils';
import { LineChart, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface FredSeries {
  id: string;
  title: string;
  frequency: string;
  units: string;
  seasonal_adjustment: string;
  last_updated: string;
  notes: string;
}

interface FredSearchResult {
  results: FredSeries[];
  count: number;
  message: string;
}

interface FredSearchProps {
  toolCallId: string;
  toolInvocation: ToolInvocation & { result?: FredSearchResult };
  onShowChart: (seriesId: string) => void;
}

export function FredSearch({ toolCallId, toolInvocation, onShowChart }: FredSearchProps) {
  const { result } = toolInvocation;
  const [expandedNotes, setExpandedNotes] = useState<{ [key: string]: boolean }>({});

  if (!result) {
    return <div className="text-muted-foreground">Loading search results...</div>;
  }
  
  const { results, count, message } = result;

  const toggleNotes = (id: string) => {
    setExpandedNotes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">FRED Search Results</h3>
          <span className="text-sm text-zinc-400">{results.length} results found</span>
        </div>
        
        <div className="space-y-3">
          {results.map((result: FredSeries) => (
            <div 
              key={result.id}
              className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-3 sm:p-4 hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium">{result.title}</h4>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-zinc-400">
                    <span className="px-2 py-1 bg-zinc-700/50 rounded-full">{result.frequency}</span>
                    <span className="px-2 py-1 bg-zinc-700/50 rounded-full">{result.units}</span>
                    {result.seasonal_adjustment && (
                      <span className="px-2 py-1 bg-zinc-700/50 rounded-full">{result.seasonal_adjustment}</span>
                    )}
                  </div>
                  {result.notes && (
                    <div className="mt-2">
                      <p className={`text-sm text-zinc-400 ${!expandedNotes[result.id] ? 'line-clamp-2' : ''}`}>
                        {result.notes}
                      </p>
                      {result.notes.length > 100 && (
                        <button
                          onClick={() => toggleNotes(result.id)}
                          className="mt-1 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                          {expandedNotes[result.id] ? (
                            <>
                              Show Less <ChevronUp className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              Show More <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onShowChart(result.id)}
                  className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-400/10 hover:bg-indigo-400/20 rounded-lg transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  <LineChart className="w-4 h-4" />
                  Show Chart
                </button>
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                Last updated: {new Date(result.last_updated).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 