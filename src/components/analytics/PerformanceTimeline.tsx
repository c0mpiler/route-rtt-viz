/**
 * PerformanceTimeline - Real-time performance monitoring and visualization
 */
import React from 'react';
import { PerformanceMetric, NetworkMetrics } from './AdvancedAnalytics';
import { motion } from 'framer-motion';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartData, ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface PerformanceTimelineProps {
  performanceHistory: PerformanceMetric[];
  networkMetrics: NetworkMetrics | null;
}

export const PerformanceTimeline: React.FC<PerformanceTimelineProps> = ({ performanceHistory, networkMetrics }) => {
  const [selectedMetric, setSelectedMetric] = React.useState<'render' | 'calculation' | 'memory' | 'cpu'>('render');
  
  // Filter metrics by selected type
  const filteredMetrics = performanceHistory.filter(m => m.metric === selectedMetric);
  
  // Prepare chart data
  const chartData: ChartData<'line'> = {
    labels: filteredMetrics.map(m => {
      const date = new Date(m.timestamp);
      return date.toLocaleTimeString();
    }),
    datasets: [
      {
        label: selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1),
        data: filteredMetrics.map(m => m.value),
        borderColor: 'rgb(79, 70, 229)',
        backgroundColor: 'rgba(79, 70, 229, 0.5)',
        tension: 0.1,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: `${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Performance Over Time`,
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        callbacks: {
          title: (context) => {
            const date = new Date(filteredMetrics[context[0].dataIndex].timestamp);
            return date.toLocaleString();
          },
          label: (context) => `${context.dataset.label}: ${context.raw}ms`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: selectedMetric !== 'memory',
        title: {
          display: true,
          text: selectedMetric === 'memory' ? 'Memory (MB)' : 'Time (ms)',
        },
      },
    },
  };

  // Calculate performance statistics
  const performanceStats = React.useMemo(() => {
    if (filteredMetrics.length === 0) return null;
    
    const values = filteredMetrics.map(m => m.value);
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const recent = values.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, values.length);
    
    return { average, min, max, recent };
  }, [filteredMetrics]);

  return (
    <div className="space-y-6">
      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-secondary-50 p-6 rounded-lg"
        >
          <h3 className="text-sm font-medium text-secondary-600 mb-1">Total Measurements</h3>
          <p className="text-3xl font-bold text-secondary-900">{performanceHistory.length}</p>
          <p className="text-sm text-secondary-500 mt-2">Data points collected</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-secondary-50 p-6 rounded-lg"
        >
          <h3 className="text-sm font-medium text-secondary-600 mb-1">Average Latency</h3>
          <p className="text-3xl font-bold text-secondary-900">
            {networkMetrics ? networkMetrics.averageLatency.toFixed(1) : '--'}ms
          </p>
          <p className="text-sm text-secondary-500 mt-2">Network performance</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-secondary-50 p-6 rounded-lg"
        >
          <h3 className="text-sm font-medium text-secondary-600 mb-1">Path Efficiency</h3>
          <p className="text-3xl font-bold text-secondary-900">
            {networkMetrics ? (networkMetrics.pathEfficiency * 100).toFixed(1) : '--'}%
          </p>
          <p className="text-sm text-secondary-500 mt-2">Routing optimization</p>
        </motion.div>

        {performanceStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="bg-secondary-50 p-6 rounded-lg"
          >
            <h3 className="text-sm font-medium text-secondary-600 mb-1">Recent {selectedMetric}</h3>
            <p className="text-3xl font-bold text-secondary-900">{performanceStats.recent.toFixed(1)}ms</p>
            <p className="text-sm text-secondary-500 mt-2">Last 10 samples average</p>
          </motion.div>
        )}
      </div>

      {/* Metric Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="flex space-x-4"
      >
        {(['render', 'calculation', 'memory', 'cpu'] as const).map((metric) => (
          <button
            key={metric}
            onClick={() => setSelectedMetric(metric)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              selectedMetric === metric
                ? 'bg-primary-100 text-primary-700'
                : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
            }`}
          >
            {metric.charAt(0).toUpperCase() + metric.slice(1)}
          </button>
        ))}
      </motion.div>

      {/* Performance Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="bg-white border border-secondary-200 rounded-lg p-6"
      >
        <div className="h-80">
          <Line data={chartData} options={chartOptions} />
        </div>
      </motion.div>

      {/* Performance Statistics */}
      {performanceStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          className="bg-white border border-secondary-200 rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">
            {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <h4 className="text-sm font-medium text-secondary-600">Average</h4>
              <p className="text-2xl font-bold text-secondary-900 mt-1">
                {performanceStats.average.toFixed(1)}ms
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-secondary-600">Minimum</h4>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {performanceStats.min.toFixed(1)}ms
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-secondary-600">Maximum</h4>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {performanceStats.max.toFixed(1)}ms
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-secondary-600">Volatility</h4>
              <p className="text-2xl font-bold text-secondary-900 mt-1">
                {((performanceStats.max - performanceStats.min) / performanceStats.average).toFixed(2)}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Performance Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.7 }}
        className="bg-white border border-secondary-200 rounded-lg p-6"
      >
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Performance Alerts</h3>
        <PerformanceAlerts performanceMetrics={filteredMetrics} stats={performanceStats} />
      </motion.div>
    </div>
  );
};

const PerformanceAlerts: React.FC<{
  performanceMetrics: PerformanceMetric[];
  stats: { average: number; max: number } | null;
}> = ({ performanceMetrics, stats }) => {
  if (!stats || performanceMetrics.length < 10) {
    return <p className="text-secondary-600">Collecting performance data...</p>;
  }

  const alerts = [];
  
  // Check for performance degradation
  const recentAverage = performanceMetrics.slice(-10).reduce((a, b) => a + b.value, 0) / 10;
  if (recentAverage > stats.average * 1.5) {
    alerts.push({
      type: 'warning',
      title: 'Performance Degradation Detected',
      description: `Recent performance is ${((recentAverage / stats.average - 1) * 100).toFixed(0)}% worse than average`,
    });
  }

  // Check for performance spikes
  const recentSpikes = performanceMetrics.slice(-50).filter(m => m.value > stats.average * 2).length;
  if (recentSpikes > 0) {
    alerts.push({
      type: 'info',
      title: 'Performance Spikes Observed',
      description: `Detected ${recentSpikes} performance spikes in the last 50 measurements`,
    });
  }

  // Check for consistent good performance
  const recentGoodPerformance = performanceMetrics.slice(-10).every(m => m.value < stats.average);
  if (recentGoodPerformance) {
    alerts.push({
      type: 'success',
      title: 'Optimal Performance',
      description: 'Application performance is consistently better than average',
    });
  }

  if (alerts.length === 0) {
    return <p className="text-secondary-600">No performance issues detected</p>;
  }

  return (
    <div className="space-y-4">
      {alerts.map((alert, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className={`flex items-start p-4 rounded-lg ${
            alert.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
            alert.type === 'info' ? 'bg-blue-50 border border-blue-200' :
            'bg-green-50 border border-green-200'
          }`}
        >
          <div className="flex-shrink-0">
            {alert.type === 'warning' && (
              <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {alert.type === 'info' && (
              <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {alert.type === 'success' && (
              <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-secondary-900">{alert.title}</h4>
            <p className="mt-1 text-sm text-secondary-600">{alert.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
