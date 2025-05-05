/**
 * MetricsPanel - Advanced network metrics visualization
 */
import React from 'react';
import { NetworkMetrics, NetworkInsight } from './AdvancedAnalytics';
import { Path } from '../../types/network';
import { motion } from 'framer-motion';

interface MetricsPanelProps {
  metrics: NetworkMetrics;
  paths: Path[];
  insights: NetworkInsight[];
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics, paths, insights }) => {
  const efficiencyColor = metrics.pathEfficiency > 0.9 ? 'text-green-600' : 
                          metrics.pathEfficiency > 0.7 ? 'text-yellow-600' : 
                          'text-red-600';

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-secondary-50 p-6 rounded-lg"
        >
          <h3 className="text-sm font-medium text-secondary-600 mb-1">Average Latency</h3>
          <p className="text-3xl font-bold text-secondary-900">{metrics.averageLatency.toFixed(1)}ms</p>
          <p className="text-sm text-secondary-500 mt-2">Across {paths.length} paths</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-secondary-50 p-6 rounded-lg"
        >
          <h3 className="text-sm font-medium text-secondary-600 mb-1">Path Efficiency</h3>
          <p className={`text-3xl font-bold ${efficiencyColor}`}>
            {(metrics.pathEfficiency * 100).toFixed(1)}%
          </p>
          <p className="text-sm text-secondary-500 mt-2">Optimal routing score</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-secondary-50 p-6 rounded-lg"
        >
          <h3 className="text-sm font-medium text-secondary-600 mb-1">Latency Variance</h3>
          <p className="text-3xl font-bold text-secondary-900">{metrics.latencyVariance.toFixed(1)}</p>
          <p className="text-sm text-secondary-500 mt-2">Network consistency</p>
        </motion.div>
      </div>

      {/* Node Utilization Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="bg-white border border-secondary-200 rounded-lg p-6"
      >
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Node Utilization</h3>
        <div className="relative h-64">
          <NodeUtilizationChart utilization={metrics.nodeUtilization} />
        </div>
      </motion.div>

      {/* Insights Panel */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="bg-white border border-secondary-200 rounded-lg p-6"
      >
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Network Insights</h3>
        <div className="space-y-4">
          {insights.length === 0 ? (
            <p className="text-secondary-600 text-center py-8">
              No optimization opportunities detected. Network is performing optimally.
            </p>
          ) : (
            insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

const NodeUtilizationChart: React.FC<{ utilization: number[] }> = ({ utilization }) => {
  const maxValue = Math.max(...utilization);
  
  return (
    <div className="flex h-full items-end gap-2 overflow-x-auto pb-4">
      {utilization.map((value, index) => (
        <div
          key={index}
          className="relative group"
          style={{ height: `${(value / maxValue) * 100}%`, minWidth: '20px' }}
        >
          <div 
            className="absolute bottom-0 w-full bg-primary-500 rounded-t transition-colors duration-200 group-hover:bg-primary-600"
            style={{ height: '100%' }}
          />
          <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs text-secondary-600">
            {index + 1}
          </div>
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-secondary-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {value}
          </div>
        </div>
      ))}
    </div>
  );
};

const InsightCard: React.FC<{ insight: NetworkInsight }> = ({ insight }) => {
  const getIcon = () => {
    switch (insight.type) {
      case 'optimization':
        return (
          <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="h-5 w-5 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="bg-secondary-50 p-4 rounded-lg border border-secondary-200">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <h4 className="text-sm font-medium text-secondary-900">{insight.title}</h4>
          <p className="mt-1 text-sm text-secondary-600">{insight.description}</p>
          {insight.recommendation && (
            <p className="mt-2 text-sm text-secondary-700 italic">
              Recommendation: {insight.recommendation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
