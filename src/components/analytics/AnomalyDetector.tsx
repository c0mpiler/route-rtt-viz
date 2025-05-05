/**
 * AnomalyDetector - Network anomaly detection and analysis
 */
import React from 'react';
import { Anomaly, NetworkInsight } from './AdvancedAnalytics';
import { motion } from 'framer-motion';

interface AnomalyDetectorProps {
  anomalies: Anomaly[];
  onDetect: () => void;
  insights: NetworkInsight[];
}

export const AnomalyDetector: React.FC<AnomalyDetectorProps> = ({ anomalies, onDetect, insights }) => {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);

  const handleScan = async () => {
    setIsAnalyzing(true);
    try {
      onDetect();
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Group anomalies by type
  const anomalyGroups = React.useMemo(() => {
    const groups: Record<string, Anomaly[]> = {};
    anomalies.forEach(anomaly => {
      if (!groups[anomaly.type]) {
        groups[anomaly.type] = [];
      }
      groups[anomaly.type].push(anomaly);
    });
    return groups;
  }, [anomalies]);

  // Calculate severities
  const severityCounts = React.useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0 };
    anomalies.forEach(anomaly => {
      counts[anomaly.severity]++;
    });
    return counts;
  }, [anomalies]);

  return (
    <div className="space-y-6">
      {/* Anomaly Overview */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-secondary-900">Network Anomaly Detection</h3>
          <p className="text-sm text-secondary-600">Real-time network health monitoring</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleScan}
          disabled={isAnalyzing}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
            isAnalyzing
              ? 'bg-secondary-100 text-secondary-600 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          {isAnalyzing ? 'Scanning...' : 'Scan for Anomalies'}
        </motion.button>
      </div>

      {/* Severity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg"
        >
          <h4 className="text-sm font-medium text-yellow-800 mb-1">Low Severity</h4>
          <p className="text-3xl font-bold text-yellow-900">{severityCounts.low}</p>
          <p className="text-sm text-yellow-700 mt-2">Minor issues detected</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-orange-50 border border-orange-200 p-6 rounded-lg"
        >
          <h4 className="text-sm font-medium text-orange-800 mb-1">Medium Severity</h4>
          <p className="text-3xl font-bold text-orange-900">{severityCounts.medium}</p>
          <p className="text-sm text-orange-700 mt-2">Moderate issues detected</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-red-50 border border-red-200 p-6 rounded-lg"
        >
          <h4 className="text-sm font-medium text-red-800 mb-1">High Severity</h4>
          <p className="text-3xl font-bold text-red-900">{severityCounts.high}</p>
          <p className="text-sm text-red-700 mt-2">Critical issues detected</p>
        </motion.div>
      </div>

      {/* Anomaly Types */}
      <div className="space-y-6">
        {Object.entries(anomalyGroups).map(([type, anomaliesList], index) => (
          <motion.div
            key={type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
            className="bg-white border border-secondary-200 rounded-lg p-6"
          >
            <h4 className="text-lg font-medium text-secondary-900 mb-4 capitalize">
              {type.replace(/-/g, ' ')} ({anomaliesList.length})
            </h4>
            <div className="space-y-4">
              {anomaliesList.map((anomaly, anomalyIndex) => (
                <AnomalyCard
                  key={anomaly.timestamp}
                  anomaly={anomaly}
                  index={anomalyIndex}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Network Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.7 }}
        className="bg-white border border-secondary-200 rounded-lg p-6"
      >
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Network Health Insights</h3>
        {insights.length === 0 ? (
          <p className="text-secondary-600 text-center py-8">
            No critical network insights at this time.
          </p>
        ) : (
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <NetworkInsightCard
                key={insight.id}
                insight={insight}
                index={index}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Timeline View */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.8 }}
        className="bg-white border border-secondary-200 rounded-lg p-6"
      >
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Anomaly Timeline</h3>
        <AnomalyTimeline anomalies={anomalies} />
      </motion.div>
    </div>
  );
};

const AnomalyCard: React.FC<{ anomaly: Anomaly; index: number }> = ({ anomaly, index }) => {
  const getSeverityColor = (severity: Anomaly['severity']) => {
    switch (severity) {
      case 'low':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'medium':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getTypeIcon = (type: Anomaly['type']) => {
    switch (type) {
      case 'latency-spike':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'path-degradation':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        );
      case 'topology-change':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="flex items-start p-4 bg-secondary-50 rounded-lg"
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getSeverityColor(anomaly.severity)}`}>
        {getTypeIcon(anomaly.type)}
      </div>
      <div className="ml-3 flex-1">
        <div className="flex items-center justify-between">
          <h5 className="text-sm font-medium text-secondary-900">{anomaly.description}</h5>
          <span className="text-xs text-secondary-500">
            {new Date(anomaly.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <div className="mt-1 text-sm text-secondary-600">
          Affected nodes: {anomaly.affectedNodes.join(', ')}
        </div>
      </div>
    </motion.div>
  );
};

const NetworkInsightCard: React.FC<{ insight: NetworkInsight; index: number }> = ({ insight, index }) => {
  const getInsightColor = (type: NetworkInsight['type']) => {
    switch (type) {
      case 'optimization':
        return 'text-blue-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-secondary-600';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-secondary-50 p-4 rounded-lg"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className={`h-5 w-5 ${getInsightColor(insight.type)}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h5 className="text-sm font-medium text-secondary-900">{insight.title}</h5>
          <p className="mt-1 text-sm text-secondary-600">{insight.description}</p>
          {insight.recommendation && (
            <p className="mt-2 text-sm text-secondary-700 italic">
              Recommendation: {insight.recommendation}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const AnomalyTimeline: React.FC<{ anomalies: Anomaly[] }> = ({ anomalies }) => {
  const sortedAnomalies = React.useMemo(() => {
    return [...anomalies].sort((a, b) => b.timestamp - a.timestamp);
  }, [anomalies]);

  if (sortedAnomalies.length === 0) {
    return (
      <div className="text-center py-8 text-secondary-600">
        No anomalies detected in the current session.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-secondary-200" />
      <div className="space-y-6">
        {sortedAnomalies.map((anomaly, index) => (
          <motion.div
            key={anomaly.timestamp}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="relative flex items-start ml-6"
          >
            <div className={`absolute left-0 w-3 h-3 rounded-full border-2 transform -translate-x-1/2 -translate-y-0.5 ${
              anomaly.severity === 'high' ? 'bg-red-500 border-red-200' :
              anomaly.severity === 'medium' ? 'bg-orange-500 border-orange-200' :
              'bg-yellow-500 border-yellow-200'
            }`} />
            <div className="pl-8">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-medium text-secondary-900">{anomaly.description}</h5>
                <span className="text-xs text-secondary-500">
                  {new Date(anomaly.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-secondary-600 mt-1">
                Type: {anomaly.type} • Severity: {anomaly.severity}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
