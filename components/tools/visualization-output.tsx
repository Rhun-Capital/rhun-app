import React from 'react';
import { Card } from '@/components/ui/card';

interface ChartData {
  type: string;
  data: string;
  format: string;
}

interface VisualizationOutputProps {
  charts: ChartData[];
  text?: string;
  logs?: {
    stdout: string[];
    stderr: string[];
  };
  error?: any;
}

const VisualizationOutput: React.FC<VisualizationOutputProps> = ({ charts, text, logs, error }) => {
  return (
    <Card className="p-4 bg-zinc-800/30 border-zinc-700">
      {/* Display any error messages */}
      {error && (
        <div className="text-red-500 mb-4">
          {typeof error === 'string' ? error : error.message || 'An error occurred'}
        </div>
      )}

      {/* Display charts/visualizations */}
      {charts && charts.length > 0 && (
        <div className="space-y-4">
          {charts.map((chart, index) => (
            <div key={index} className="flex justify-center">
              {chart.type === 'image/png' && (
                <img
                  src={`data:image/png;base64,${chart.data}`}
                  alt={`Chart ${index + 1}`}
                  className="max-w-full rounded-lg"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Display text output */}
      {text && (
        <div className="mt-4 text-sm text-zinc-300 whitespace-pre-wrap">
          {text}
        </div>
      )}

      {/* Display logs if any */}
      {logs && (logs.stdout.length > 0 || logs.stderr.length > 0) && (
        <div className="mt-4">
          {logs.stdout.length > 0 && (
            <div className="text-sm text-zinc-300 whitespace-pre-wrap">
              {logs.stdout.join('\n')}
            </div>
          )}
          {logs.stderr.length > 0 && (
            <div className="text-sm text-red-400 whitespace-pre-wrap">
              {logs.stderr.join('\n')}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default VisualizationOutput; 