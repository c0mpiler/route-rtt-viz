/**
 * DebugTools - Debugging tools for development
 * 
 * This component provides development-only debugging tools
 * for testing and monitoring the application.
 */
import React from 'react';
import { NetworkGraph } from '../../utils/network/NetworkGraph';

interface DebugToolsProps {
  /** NetworkGraph instance */
  graph: NetworkGraph | null;
  
  /** Handler for testing Chicago to Dallas path */
  onTestChicagoDallas: () => void;
  
  /** Handler for debugging graph structure */
  onDebugGraph: () => void;
  
  /** Handler for force recalculation */
  onRecalculate: () => void;
  
  /** Handler for showing cache stats */
  onShowCacheStats: () => void;
  
  /** Handler for clearing cache */
  onClearCache: () => void;
  
  /** Whether to show cache statistics */
  showCacheStats: boolean;
}

/**
 * Debugging tools component
 * 
 * This component is only rendered in development mode
 */
export const DebugTools: React.FC<DebugToolsProps> = ({
  graph,
  onTestChicagoDallas,
  onDebugGraph,
  onRecalculate,
  onShowCacheStats,
  onClearCache,
  showCacheStats
}) => {
  // Only render in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="mt-4 bg-yellow-50 p-4 rounded-md border border-yellow-300">
      <h3 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 mr-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        Advanced Debugging Tools:
      </h3>
      <div className="flex flex-wrap gap-2">
        <button
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition-colors duration-150"
          onClick={onTestChicagoDallas}
        >
          Test Chicago→Dallas
        </button>
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors duration-150"
          onClick={onDebugGraph}
        >
          Debug Graph
        </button>
        <button
          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors duration-150"
          onClick={onRecalculate}
        >
          Force Recalculation
        </button>
        <button
          className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm transition-colors duration-150"
          onClick={onShowCacheStats}
        >
          Show Cache Stats
        </button>
        <button
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors duration-150"
          onClick={onClearCache}
        >
          Clear Cache
        </button>
      </div>

      {showCacheStats && graph && (
        <div className="mt-4 bg-white p-3 rounded border border-yellow-200 text-xs font-mono">
          <h4 className="font-semibold mb-1">
            Cache Statistics:
          </h4>
          <pre className="overflow-x-auto">
            {JSON.stringify(graph.getCacheStats(), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
