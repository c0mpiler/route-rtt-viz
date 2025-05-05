/**
 * AdvancedAnalytics - Sophisticated analytics and performance monitoring system
 * 
 * This component provides enterprise-grade analytics, visualization, and performance monitoring
 * for the IBM Cloud Latency Pathfinder application. It offers deep insights into network
 * performance, latency patterns, and optimization opportunities.
 * 
 * Key Features:
 * - Real-time performance metrics
 * - Network topology analysis
 * - Latency distribution statistics
 * - Historical data tracking
 * - Performance anomaly detection
 * - Export capabilities for reports
 * - Interactive visualizations
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { NetworkGraph } from '../../utils/network/NetworkGraph';
import { Path } from '../../types/network';
import { networkLogger } from '../../utils/logger';
import { usePerformanceTracking } from '../../utils/performance';
import { motion } from 'framer-motion';
import { MetricsPanel } from './MetricsPanel';
import { TopologyAnalysis } from './TopologyAnalysis';
import { LatencyDistribution } from './LatencyDistribution';
import { PerformanceTimeline } from './PerformanceTimeline';
import { AnomalyDetector } from './AnomalyDetector';
import { ExportTools } from './ExportTools';

interface AdvancedAnalyticsProps {
  graph: NetworkGraph | null;
  paths: Path[];
  longestPath: Path | null;
  longestPathBetween: Path | null;
  sourceRegion: string | null;
  targetRegion: string | null;
  onExport?: (data: AnalyticsData) => void;
}

export interface AnalyticsData {
  timestamp: number;
  metrics: NetworkMetrics;
  topology: TopologyStats;
  latencyDistribution: LatencyStats;
  performanceHistory: PerformanceMetric[];
  anomalies: Anomaly[];
  insights: NetworkInsight[];
}

interface NetworkMetrics {
  averageLatency: number;
  medianLatency: number;
  latencyVariance: number;
  pathEfficiency: number;
  nodeUtilization: number[];
  edgeLatencyMap: Map<string, number>;
}

interface TopologyStats {
  nodeCount: number;
  edgeCount: number;
  averageDegree: number;
  density: number;
  diameter: number;
  clusteringCoefficient: number;
  criticalNodes: string[];
}

interface LatencyStats {
  distribution: { range: string; count: number }[];
  percentiles: { p50: number; p75: number; p90: number; p95: number; p99: number };
  outliers: { region: string; latency: number }[];
}

interface PerformanceMetric {
  timestamp: number;
  component: string;
  metric: 'render' | 'calculation' | 'memory' | 'cpu';
  value: number;
}

interface Anomaly {
  timestamp: number;
  type: 'latency-spike' | 'path-degradation' | 'topology-change';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedNodes: string[];
}

interface NetworkInsight {
  id: string;
  type: 'optimization' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation?: string;
  priority: number;
}

export const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({
  graph,
  paths,
  longestPath,
  longestPathBetween,
  sourceRegion,
  targetRegion,
  onExport
}) => {
  usePerformanceTracking('AdvancedAnalytics');
  
  const [activeTab, setActiveTab] = useState<'metrics' | 'topology' | 'distribution' | 'timeline' | 'anomalies'>('metrics');
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceMetric[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Calculate comprehensive network metrics
  const networkMetrics = useMemo(() => {
    if (!graph || paths.length === 0) return null;

    const latencies = paths.map(p => p.latency);
    const averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const medianLatency = sortedLatencies[Math.floor(sortedLatencies.length / 2)];
    
    // Calculate variance
    const variance = latencies.reduce((acc, val) => acc + Math.pow(val - averageLatency, 2), 0) / latencies.length;
    
    // Calculate path efficiency (ratio of direct vs actual path latency)
    const pathEfficiency = paths.reduce((sum, path) => {
      if (!path?.route || path.route.length < 2) return sum;
      const sourceConnections = graph.getConnections(path.route[0]);
      const directLatency = sourceConnections[path.route[path.route.length - 1]] || Infinity;
      return sum + (directLatency / path.latency);
    }, 0) / Math.max(paths.length, 1);

    // Build edge latency map
    const edgeLatencyMap = new Map<string, number>();
    paths.forEach(path => {
      if (!path?.route) return;
      for (let i = 0; i < path.route.length - 1; i++) {
        const edge = `${path.route[i]}-${path.route[i + 1]}`;
        const sourceConnections = graph.getConnections(path.route[i]);
        const latency = sourceConnections[path.route[i + 1]];
        if (latency) {
          edgeLatencyMap.set(edge, latency);
        }
      }
    });

    return {
      averageLatency,
      medianLatency,
      latencyVariance: variance,
      pathEfficiency,
      nodeUtilization: calculateNodeUtilization(graph, paths),
      edgeLatencyMap
    } as NetworkMetrics;
  }, [graph, paths]);

  // Calculate topology statistics
  const topologyStats = useMemo(() => {
    if (!graph) return null;

    const nodes = graph.getRegions();
    const nodeCount = nodes.length;
    
    // Calculate edge count from adjacency list
    let edgeCount = 0;
    nodes.forEach(node => {
      const connections = graph.getConnections(node);
      edgeCount += Object.keys(connections).length;
    });
    // Divide by 2 because we count each edge twice in an undirected graph
    edgeCount = Math.floor(edgeCount / 2);

    // Calculate degree distribution
    const degrees = nodes.map(node => Object.keys(graph.getConnections(node)).length);
    const averageDegree = degrees.reduce((a, b) => a + b, 0) / nodeCount;
    const density = (2 * edgeCount) / (nodeCount * (nodeCount - 1));
    
    // Calculate network diameter (longest shortest path)
    const diameter = calculateNetworkDiameter(graph);
    
    // Calculate clustering coefficient
    const clusteringCoefficient = calculateClusteringCoefficient(graph);
    
    // Identify critical nodes (nodes with highest betweenness centrality)
    const criticalNodes = identifyCriticalNodes(graph, paths);

    return {
      nodeCount,
      edgeCount,
      averageDegree,
      density,
      diameter,
      clusteringCoefficient,
      criticalNodes
    } as TopologyStats;
  }, [graph, paths]);

  // Calculate latency distribution statistics
  const latencyDistribution = useMemo(() => {
    if (!paths.length) return null;

    const latencies = paths.map(p => p.latency);
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);
    const range = max - min;
    const binCount = 10;
    const binSize = range / binCount;

    // Create histogram
    const distribution = Array.from({ length: binCount }, (_, i) => {
      const start = min + i * binSize;
      const end = start + binSize;
      const count = latencies.filter(l => l >= start && (i === binCount - 1 ? l <= end : l < end)).length;
      return {
        range: `${start.toFixed(1)}-${end.toFixed(1)}ms`,
        count
      };
    });

    // Calculate percentiles - safe implementation
    const sorted = [...latencies].sort((a, b) => a - b);
    const length = sorted.length;
    
    const getPercentile = (percentile: number): number => {
      const index = Math.floor(percentile * length);
      return sorted[Math.min(index, length - 1)] || 0;
    };
    
    const percentiles = {
      p50: getPercentile(0.50),
      p75: getPercentile(0.75),
      p90: getPercentile(0.90),
      p95: getPercentile(0.95),
      p99: getPercentile(0.99)
    };

    // Identify outliers (values outside 1.5 * IQR)
    const q1Index = Math.floor(0.25 * length);
    const q3Index = Math.floor(0.75 * length);
    const q1 = sorted[q1Index] || 0;
    const q3 = sorted[q3Index] || 0;
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    const outliers = paths
      .filter(p => p.latency < lowerBound || p.latency > upperBound)
      .map(p => ({
        region: `${p.route[0]} → ${p.route[p.route.length - 1]}`,
        latency: p.latency
      }));

    return {
      distribution,
      percentiles,
      outliers
    } as LatencyStats;
  }, [paths]);

  // Detect network anomalies
  const detectAnomalies = useCallback(() => {
    const newAnomalies: Anomaly[] = [];

    if (networkMetrics && graph) {
      // Check for latency spikes
      const latencyThreshold = networkMetrics.averageLatency * 2;
      paths.forEach(path => {
        if (path.latency > latencyThreshold) {
          newAnomalies.push({
            timestamp: Date.now(),
            type: 'latency-spike',
            severity: path.latency > latencyThreshold * 1.5 ? 'high' : 'medium',
            description: `High latency detected on path: ${path.route.join(' → ')}`,
            affectedNodes: path.route
          });
        }
      });

      // Check for path degradation
      if (longestPath && longestPathBetween) {
        const efficiencyRatio = longestPathBetween.latency / longestPath.latency;
        if (efficiencyRatio > 0.7) {
          newAnomalies.push({
            timestamp: Date.now(),
            type: 'path-degradation',
            severity: 'medium',
            description: `Inefficient path detected between ${sourceRegion} and ${targetRegion}`,
            affectedNodes: [sourceRegion!, targetRegion!]
          });
        }
      }
    }

    setAnomalies(prev => [...prev, ...newAnomalies].slice(-50)); // Keep last 50 anomalies
  }, [networkMetrics, paths, longestPath, longestPathBetween, sourceRegion, targetRegion, graph]);

  // Track performance metrics
  useEffect(() => {
    const interval = setInterval(() => {
      const performanceEntry: PerformanceMetric = {
        timestamp: Date.now(),
        component: 'AdvancedAnalytics',
        metric: 'render',
        value: window.performance.now()
      };
      setPerformanceHistory(prev => [...prev.slice(-100), performanceEntry]); // Keep last 100 metrics
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Detect anomalies when data changes
  useEffect(() => {
    detectAnomalies();
  }, [paths, networkMetrics, detectAnomalies]);

  // Generate network insights
  const generateInsights = useCallback((): NetworkInsight[] => {
    const insights: NetworkInsight[] = [];

    if (networkMetrics && topologyStats) {
      // Efficiency insights
      if (networkMetrics.pathEfficiency < 0.8) {
        insights.push({
          id: 'efficiency-1',
          type: 'optimization',
          title: 'Network Path Inefficiency',
          description: 'Some paths are significantly longer than optimal routes',
          recommendation: 'Consider adding direct connections between frequently accessed regions',
          priority: 8
        });
      }

      // Topology insights
      if (topologyStats.density < 0.3) {
        insights.push({
          id: 'topology-1',
          type: 'warning',
          title: 'Low Network Density',
          description: 'Network has fewer connections than recommended for optimal performance',
          recommendation: 'Increase mesh connectivity to improve redundancy',
          priority: 6
        });
      }

      // Critical node insights
      topologyStats.criticalNodes.forEach((node, index) => {
        insights.push({
          id: `critical-${index}`,
          type: 'warning',
          title: `Critical Node: ${node}`,
          description: `This node handles a disproportionate amount of traffic`,
          recommendation: 'Consider load balancing or adding redundant paths',
          priority: 7
        });
      });
    }

    return insights.sort((a, b) => b.priority - a.priority);
  }, [networkMetrics, topologyStats]);

  // Handle export
  const handleExport = useCallback(() => {
    if (!networkMetrics || !topologyStats || !latencyDistribution) return;

    const analyticsData: AnalyticsData = {
      timestamp: Date.now(),
      metrics: networkMetrics,
      topology: topologyStats,
      latencyDistribution,
      performanceHistory: performanceHistory.slice(-1000), // Last 1000 metrics
      anomalies: anomalies.slice(-100), // Last 100 anomalies
      insights: generateInsights()
    };

    onExport?.(analyticsData);
    networkLogger.info('Analytics data exported', analyticsData);
  }, [networkMetrics, topologyStats, latencyDistribution, performanceHistory, anomalies, generateInsights, onExport]);

  if (!graph) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="text-secondary-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-secondary-700 mb-2">Analytics Initializing</h3>
        <p className="text-secondary-600">Network data is loading...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg shadow-lg"
    >
      {/* Header */}
      <div className="border-b border-secondary-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-secondary-900">Advanced Network Analytics</h2>
            <p className="text-sm text-secondary-600 mt-1">Real-time performance and topology analysis</p>
          </div>
          <div className="flex space-x-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExport}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Data
            </motion.button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-secondary-200">
        <nav className="flex px-6" aria-label="Analytics tabs">
          {(['metrics', 'topology', 'distribution', 'timeline', 'anomalies'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-4 text-sm font-medium capitalize transition-colors duration-200 border-b-2 ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-secondary-600 hover:text-secondary-800 hover:border-secondary-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'metrics' && networkMetrics && (
          <MetricsPanel 
            metrics={networkMetrics} 
            paths={paths}
            insights={generateInsights()}
          />
        )}
        
        {activeTab === 'topology' && topologyStats && (
          <TopologyAnalysis 
            stats={topologyStats}
            graph={graph}
            paths={paths}
          />
        )}
        
        {activeTab === 'distribution' && latencyDistribution && (
          <LatencyDistribution 
            distribution={latencyDistribution}
            paths={paths}
          />
        )}
        
        {activeTab === 'timeline' && (
          <PerformanceTimeline 
            performanceHistory={performanceHistory}
            networkMetrics={networkMetrics}
          />
        )}
        
        {activeTab === 'anomalies' && (
          <AnomalyDetector 
            anomalies={anomalies}
            onDetect={detectAnomalies}
            insights={generateInsights()}
          />
        )}
      </div>
    </motion.div>
  );
};

// Helper functions
function calculateNodeUtilization(graph: NetworkGraph, paths: Path[]): number[] {
  const nodes = graph.getRegions();
  const utilization = new Map<string, number>();
  
  nodes.forEach(node => utilization.set(node, 0));
  
  paths.forEach(path => {
    if (!path?.route) return;
    path.route.forEach(node => {
      if (!node) return;
      utilization.set(node, (utilization.get(node) || 0) + 1);
    });
  });
  
  return Array.from(utilization.values());
}

function calculateNetworkDiameter(graph: NetworkGraph): number {
  const nodes = graph.getRegions();
  let maxDistance = 0;
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const path = graph.findShortestPath(nodes[i], nodes[j]);
      if (path) {
        maxDistance = Math.max(maxDistance, path.hops);
      }
    }
  }
  
  return maxDistance;
}

function calculateClusteringCoefficient(graph: NetworkGraph): number {
  const nodes = graph.getRegions();
  let totalCoefficient = 0;
  
  nodes.forEach(node => {
    const connections = graph.getConnections(node);
    const neighbors = Object.keys(connections);
    const k = neighbors.length;
    if (k < 2) return;
    
    let edges = 0;
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        // Check if neighbors are connected - use getConnections instead
        const neighborConnections = graph.getConnections(neighbors[i]);
        if (neighborConnections && neighbors[j] in neighborConnections) {
          edges++;
        }
      }
    }
    
    totalCoefficient += (2 * edges) / (k * (k - 1));
  });
  
  return totalCoefficient / nodes.length;
}

function identifyCriticalNodes(graph: NetworkGraph, paths: Path[]): string[] {
  const nodeImportance = new Map<string, number>();
  
  paths.forEach(path => {
    path.route.forEach((node, index) => {
      // Give more weight to intermediate nodes
      const weight = index === 0 || index === path.route.length - 1 ? 0.5 : 1;
      nodeImportance.set(node, (nodeImportance.get(node) || 0) + weight);
    });
  });
  
  return Array.from(nodeImportance.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([node]) => node);
}
