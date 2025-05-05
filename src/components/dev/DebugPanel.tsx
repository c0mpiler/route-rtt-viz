/**
 * DebugPanel - A side panel container for Enhanced Debug Tools
 * 
 * This component provides a specialized wrapper for the debug tools with:
 * - Optimized layout for side panel presentation
 * - Quick access buttons for common actions
 * - Performance metrics preview
 * - Collapsible sections for better organization
 * - Keyboard shortcuts display
 */
import React, { useState } from 'react';
import { NetworkGraph } from '../../utils/network/NetworkGraph';
import { Path } from '../../types/network';
import { motion } from 'framer-motion';
import { EnhancedDebugTools } from './EnhancedDebugTools';

interface DebugPanelProps {
  graph: NetworkGraph | null;
  paths: Path[];
  longestPath: Path | null;
  longestPathBetween: Path | null;
  sourceRegion: string | null;
  targetRegion: string | null;
  onRecalculate: () => void;
  onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  graph,
  paths,
  longestPath,
  longestPathBetween,
  sourceRegion,
  targetRegion,
  onRecalculate,
  onClose
}) => {
  const [expandedSections, setExpandedSections] = useState({
    network: true,
    performance: false,
    data: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const quickStats = graph ? {
    nodes: graph.getRegions().length,
    edges: Math.floor(Object.values(graph.toNetworkData())
      .reduce((acc, curr) => acc + Object.keys(curr).length, 0) / 2),
    paths: paths.length,
    avgLatency: paths.length ? (paths.reduce((sum, p) => sum + p.latency, 0) / paths.length).toFixed(1) : 'N/A'
  } : null;

  return (
    <div className="flex flex-col h-full">
      {/* Quick Stats Panel */}
      <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200">
        <h3 className="text-sm font-medium text-primary-900 mb-2">Network Overview</h3>
        {quickStats && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/70 rounded p-2">
              <div className="text-xs text-secondary-600">Nodes</div>
              <div className="text-lg font-semibold text-secondary-900">{quickStats.nodes}</div>
            </div>
            <div className="bg-white/70 rounded p-2">
              <div className="text-xs text-secondary-600">Edges</div>
              <div className="text-lg font-semibold text-secondary-900">{quickStats.edges}</div>
            </div>
            <div className="bg-white/70 rounded p-2">
              <div className="text-xs text-secondary-600">Paths</div>
              <div className="text-lg font-semibold text-secondary-900">{quickStats.paths}</div>
            </div>
            <div className="bg-white/70 rounded p-2">
              <div className="text-xs text-secondary-600">Avg Latency</div>
              <div className="text-lg font-semibold text-secondary-900">{quickStats.avgLatency}ms</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content with Collapsible Sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Network Analysis Section */}
        <motion.div 
          layout 
          className="border-b border-secondary-200"
        >
          <button
            onClick={() => toggleSection('network')}
            className="w-full flex items-center justify-between p-4 hover:bg-secondary-50 transition-colors"
          >
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-2 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              <span className="font-medium text-secondary-900">Network Analysis</span>
            </div>
            <svg 
              className={`h-5 w-5 text-secondary-500 transition-transform ${expandedSections.network ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSections.network && (
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-0">
                <EnhancedDebugTools
                  graph={graph}
                  paths={paths}
                  longestPath={longestPath}
                  longestPathBetween={longestPathBetween}
                  sourceRegion={sourceRegion}
                  targetRegion={targetRegion}
                  onRecalculate={onRecalculate}
                  showDebuggingTools={true}
                />
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Performance Section */}
        <motion.div 
          layout 
          className="border-b border-secondary-200"
        >
          <button
            onClick={() => toggleSection('performance')}
            className="w-full flex items-center justify-between p-4 hover:bg-secondary-50 transition-colors"
          >
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="font-medium text-secondary-900">Performance</span>
            </div>
            <svg 
              className={`h-5 w-5 text-secondary-500 transition-transform ${expandedSections.performance ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSections.performance && (
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-secondary-600">Memory Usage</span>
                    <span className="text-sm font-medium text-secondary-900">
                      {performance.memory ? 
                        `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB` : 
                        'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-secondary-600">Render Time</span>
                    <span className="text-sm font-medium text-secondary-900">
                      {performance.timing.domInteractive - performance.timing.navigationStart}ms
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Data Export Section */}
        <motion.div 
          layout 
          className="border-b border-secondary-200"
        >
          <button
            onClick={() => toggleSection('data')}
            className="w-full flex items-center justify-between p-4 hover:bg-secondary-50 transition-colors"
          >
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="font-medium text-secondary-900">Data Export</span>
            </div>
            <svg 
              className={`h-5 w-5 text-secondary-500 transition-transform ${expandedSections.data ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSections.data && (
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-0">
                <div className="grid grid-cols-3 gap-2">
                  <button className="p-2 text-xs bg-secondary-100 rounded hover:bg-secondary-200 transition-colors">
                    JSON
                  </button>
                  <button className="p-2 text-xs bg-secondary-100 rounded hover:bg-secondary-200 transition-colors">
                    CSV
                  </button>
                  <button className="p-2 text-xs bg-secondary-100 rounded hover:bg-secondary-200 transition-colors">
                    Graph
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="p-4 bg-secondary-50 border-t border-secondary-200">
        <h4 className="text-xs font-medium text-secondary-600 mb-2">Keyboard Shortcuts</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center">
            <kbd className="px-1 py-0.5 bg-white border border-secondary-300 rounded mr-2">Esc</kbd>
            <span className="text-secondary-700">Close panel</span>
          </div>
          <div className="flex items-center">
            <kbd className="px-1 py-0.5 bg-white border border-secondary-300 rounded mr-2">←→</kbd>
            <span className="text-secondary-700">Resize</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;
