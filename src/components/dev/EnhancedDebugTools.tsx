/**
 * EnhancedDebugTools - Sophisticated debugging and analytics tools
 * 
 * This component provides enterprise-grade debugging capabilities with
 * deep integration into the analytics system.
 */
import React, { useState, useCallback } from 'react';
import { NetworkGraph } from '../../utils/network/NetworkGraph';
import { Path } from '../../types/network';
import { networkLogger } from '../../utils/logger';
import { motion } from 'framer-motion';
import { DebugTools } from './DebugTools';
import { AnalyticsData } from '../analytics/AdvancedAnalytics';

// Helper function to get all edges from the graph
const getAllEdges = (graph: NetworkGraph) => {
  const networkData = graph.toNetworkData();
  const edges = new Set<string>();
  
  for (const [source, targets] of Object.entries(networkData)) {
    for (const [target, latency] of Object.entries(targets)) {
      // Only add each edge once (avoid duplicates for undirected graph)
      const edge = source < target ? `${source}-${target}` : `${target}-${source}`;
      edges.add(edge);
    }
  }
  
  return edges;
};

interface EnhancedDebugToolsProps {
  graph: NetworkGraph | null;
  paths: Path[];
  longestPath: Path | null;
  longestPathBetween: Path | null;
  sourceRegion: string | null;
  targetRegion: string | null;
  onRecalculate: () => void;
  showDebuggingTools: boolean;
}

interface DebugState {
  isExporting: boolean;
  isAnalyzing: boolean;
  exportFormat: 'json' | 'csv' | 'graphviz';
  showAnalytics: boolean;
  showPerformance: boolean;
  showCache: boolean;
}

export const EnhancedDebugTools: React.FC<EnhancedDebugToolsProps> = ({
  graph,
  paths,
  longestPath,
  longestPathBetween,
  sourceRegion,
  targetRegion,
  onRecalculate,
  showDebuggingTools
}) => {
  const [debugState, setDebugState] = useState<DebugState>({
    isExporting: false,
    isAnalyzing: false,
    exportFormat: 'json',
    showAnalytics: false,
    showPerformance: false,
    showCache: false
  });

  // Handle export data
  const handleExportAnalytics = useCallback((data: AnalyticsData) => {
    setDebugState(prev => ({ ...prev, isExporting: true }));
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let content: string;
      let filename: string;
      let mimeType: string;

      switch (debugState.exportFormat) {
        case 'json':
          content = JSON.stringify(data, null, 2);
          filename = `network-analytics-${timestamp}.json`;
          mimeType = 'application/json';
          break;
        case 'csv':
          content = convertToCSV(data);
          filename = `network-analytics-${timestamp}.csv`;
          mimeType = 'text/csv';
          break;
        case 'graphviz':
          content = generateGraphviz(data);
          filename = `network-topology-${timestamp}.dot`;
          mimeType = 'text/vnd.graphviz';
          break;
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      networkLogger.info(`Analytics data exported as ${debugState.exportFormat}`);
    } catch (error) {
      networkLogger.error('Failed to export analytics data:', error);
    } finally {
      setDebugState(prev => ({ ...prev, isExporting: false }));
    }
  }, [debugState.exportFormat]);

  // Handle network analysis
  const handleAnalyzeNetwork = useCallback(async () => {
    if (!graph) return;
    
    setDebugState(prev => ({ ...prev, isAnalyzing: true }));
    
    try {
      // Perform deep network analysis
      const startTime = performance.now();
      
      // Analyze network structure
      const nodes = graph.getRegions();
      const edges = getAllEdges(graph);
      
      // Calculate metrics
      const degreeCentrality = calculateDegreeCentrality(graph);
      const betweennessCentrality = calculateBetweennessCentrality(graph, paths);
      const clusteringCoefficients = calculateClusteringCoefficients(graph);
      
      const endTime = performance.now();
      
      const analysisResult = {
        timestamp: new Date().toISOString(),
        duration: endTime - startTime,
        networkOverview: {
          nodeCount: nodes.length,
          edgeCount: edges.size,
          averageDegree: nodes.reduce((sum, node) => sum + Object.keys(graph.getConnections(node)).length, 0) / nodes.length
        },
        centralityAnalysis: {
          degree: degreeCentrality,
          betweenness: betweennessCentrality,
          clustering: clusteringCoefficients
        },
        pathAnalysis: {
          totalPaths: paths.length,
          averageLatency: paths.reduce((sum, p) => sum + p.latency, 0) / paths.length,
          maxLatency: Math.max(...paths.map(p => p.latency)),
          minLatency: Math.min(...paths.map(p => p.latency))
        }
      };
      
      networkLogger.info('Network analysis complete:', analysisResult);
      
      // Display results in console
      console.table(analysisResult.networkOverview);
      console.log('Centrality Analysis:', analysisResult.centralityAnalysis);
      console.log('Path Analysis:', analysisResult.pathAnalysis);
      
    } catch (error) {
      networkLogger.error('Network analysis failed:', error);
    } finally {
      setDebugState(prev => ({ ...prev, isAnalyzing: false }));
    }
  }, [graph, paths]);

  // Handle performance profiling
  const handleProfilePerformance = useCallback(() => {
    if (!graph) return;
    
    const profile = {
      timestamp: new Date().toISOString(),
      memory: (performance as any).memory,
      timing: performance.timing,
      navigation: performance.navigation,
      measurements: performance.getEntries(),
      graphStats: {
        nodeCount: graph.getRegions().length,
        edgeCount: getAllEdges(graph).size,
        cacheStats: graph.getCacheStats()
      }
    };
    
    networkLogger.info('Performance profile:', profile);
    console.log('Performance Profile:', profile);
    
    // Check for memory leaks
    if ((performance as any).memory) {
      const memoryWarning = (performance as any).memory.usedJSHeapSize / (performance as any).memory.jsHeapSizeLimit;
      if (memoryWarning > 0.8) {
        networkLogger.warn('High memory usage detected!', `${(memoryWarning * 100).toFixed(1)}% of heap used`);
      }
    }
  }, [graph]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-6 bg-white rounded-lg shadow-lg p-6 border border-secondary-200"
    >
      <h3 className="text-lg font-semibold mb-4 flex items-center text-secondary-900">
        <svg className="h-5 w-5 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Advanced Debugging & Analytics Tools
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Network Analysis Panel */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-secondary-50 rounded p-4 border border-secondary-200"
        >
          <h4 className="text-sm font-medium text-secondary-700 mb-2">Network Analysis</h4>
          <div className="space-y-2">
            <button
              onClick={handleAnalyzeNetwork}
              disabled={debugState.isAnalyzing || !graph}
              className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                debugState.isAnalyzing || !graph
                  ? 'bg-secondary-200 text-secondary-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {debugState.isAnalyzing ? 'Analyzing...' : 'Analyze Network'}
            </button>
            <button
              onClick={handleProfilePerformance}
              disabled={!graph}
              className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                !graph
                  ? 'bg-secondary-200 text-secondary-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              Profile Performance
            </button>
          </div>
        </motion.div>

        {/* Data Export Panel */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-secondary-50 rounded p-4 border border-secondary-200"
        >
          <h4 className="text-sm font-medium text-secondary-700 mb-2">Data Export</h4>
          <div className="space-y-2">
            <select
              value={debugState.exportFormat}
              onChange={(e) => setDebugState(prev => ({ ...prev, exportFormat: e.target.value as any }))}
              className="w-full px-3 py-2 rounded bg-white border border-secondary-300 text-gray-900 text-sm"
            >
              <option value="json">JSON Format</option>
              <option value="csv">CSV Format</option>
              <option value="graphviz">Graphviz DOT</option>
            </select>
            <button
              onClick={() => graph && paths && handleExportAnalytics({
                timestamp: Date.now(),
                metrics: calculateNetworkMetrics(graph, paths),
                topology: calculateTopologyStats(graph),
                latencyDistribution: calculateLatencyDistribution(paths),
                performanceHistory: [],
                anomalies: [],
                insights: []
              })}
              disabled={debugState.isExporting || !graph}
              className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                debugState.isExporting || !graph
                  ? 'bg-secondary-200 text-secondary-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {debugState.isExporting ? 'Exporting...' : 'Export Network Data'}
            </button>
          </div>
        </motion.div>

        {/* Debug Information Panel */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-secondary-50 rounded p-4 border border-secondary-200"
        >
          <h4 className="text-sm font-medium text-secondary-700 mb-2">Debug Information</h4>
          <div className="space-y-1 text-sm">
            {graph && (
              <>
                <p className="text-secondary-600">Nodes: {graph.getRegions().length}</p>
                <p className="text-secondary-600">Edges: {getAllEdges(graph).size}</p>
                <p className="text-secondary-600">Paths: {paths.length}</p>
                {sourceRegion && targetRegion && (
                  <p className="text-secondary-600">
                    Route: {sourceRegion} → {targetRegion}
                  </p>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Legacy Debug Tools */}
      <div className="mt-6 border-t border-secondary-200 pt-4">
        <h4 className="text-sm font-medium text-secondary-600 mb-2">Legacy Debug Tools</h4>
        <DebugTools
          graph={graph}
          onTestChicagoDallas={() => {
            if (graph) {
              const path = graph.findShortestPath('Chicago', 'Dallas');
              networkLogger.info('Chicago → Dallas path:', path);
            }
          }}
          onDebugGraph={() => {
            if (graph) {
              networkLogger.info('Graph debug info:', {
                nodes: graph.getRegions(),
                edges: Array.from(getAllEdges(graph)),
                data: graph.toNetworkData()
              });
            }
          }}
          onRecalculate={onRecalculate}
          onShowCacheStats={() => setDebugState(prev => ({ ...prev, showCache: !prev.showCache }))}
          onClearCache={() => {
            if (graph) {
              graph.clearCache();
              networkLogger.info('Cache cleared');
            }
          }}
          showCacheStats={debugState.showCache}
        />
      </div>
    </motion.div>
  );
};

// Helper functions
function convertToCSV(data: AnalyticsData): string {
  const rows = [];
  
  // Add headers
  rows.push(['Timestamp', 'Average Latency', 'Node Count', 'Edge Count', 'Network Density']);
  
  // Add data
  rows.push([
    new Date(data.timestamp).toISOString(),
    data.metrics.averageLatency.toFixed(2),
    data.topology.nodeCount.toString(),
    data.topology.edgeCount.toString(),
    data.topology.density.toFixed(3)
  ]);
  
  return rows.map(row => row.join(',')).join('\n');
}

function generateGraphviz(data: AnalyticsData): string {
  const lines = [];
  lines.push('digraph G {');
  lines.push('  node [shape=circle];');
  lines.push('  edge [color=gray];');
  
  // Add nodes
  const nodes = Object.keys(data.metrics.edgeLatencyMap || {});
  nodes.forEach(node => {
    lines.push(`  "${node}";`);
  });
  
  // Add edges
  if (data.metrics.edgeLatencyMap) {
    data.metrics.edgeLatencyMap.forEach((latency, edge) => {
      const [source, target] = edge.split('-');
      lines.push(`  "${source}" -> "${target}" [label="${latency.toFixed(1)}ms"];`);
    });
  }
  
  lines.push('}');
  return lines.join('\n');
}

function calculateDegreeCentrality(graph: NetworkGraph): Record<string, number> {
  const centrality: Record<string, number> = {};
  graph.getRegions().forEach(node => {
    centrality[node] = Object.keys(graph.getConnections(node)).length;
  });
  return centrality;
}

function calculateBetweennessCentrality(graph: NetworkGraph, paths: Path[]): Record<string, number> {
  const centrality: Record<string, number> = {};
  
  // Initialize
  graph.getRegions().forEach(node => {
    centrality[node] = 0;
  });
  
  // Count path occurrences
  paths.forEach(path => {
    path.route.forEach((node, index) => {
      if (index > 0 && index < path.route.length - 1) {
        centrality[node] += 1;
      }
    });
  });
  
  return centrality;
}

function calculateClusteringCoefficients(graph: NetworkGraph): Record<string, number> {
  const coefficients: Record<string, number> = {};
  
  graph.getRegions().forEach(node => {
    const neighbors = Object.keys(graph.getConnections(node));
    const k = neighbors.length;
    
    if (k < 2) {
      coefficients[node] = 0;
      return;
    }
    
    let edges = 0;
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const connections = graph.getConnections(neighbors[i]);
        if (connections && neighbors[j] in connections) {
          edges++;
        }
      }
    }
    
    coefficients[node] = (2 * edges) / (k * (k - 1));
  });
  
  return coefficients;
}

function calculateNetworkMetrics(graph: NetworkGraph, paths: Path[]) {
  // Implementation details...
  return {
    averageLatency: paths.reduce((sum, p) => sum + p.latency, 0) / paths.length,
    medianLatency: paths[Math.floor(paths.length / 2)]?.latency || 0,
    latencyVariance: 0,
    pathEfficiency: 1,
    nodeUtilization: [],
    edgeLatencyMap: new Map()
  };
}

function calculateTopologyStats(graph: NetworkGraph) {
  return {
    nodeCount: graph.getRegions().length,
    edgeCount: getAllEdges(graph).size,
    averageDegree: 0,
    density: 0,
    diameter: 0,
    clusteringCoefficient: 0,
    criticalNodes: []
  };
}

function calculateLatencyDistribution(paths: Path[]) {
  return {
    distribution: [],
    percentiles: { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 },
    outliers: []
  };
}
