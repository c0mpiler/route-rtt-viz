/**
 * LatencyDistribution - Latency analysis and distribution visualization
 */
import React from 'react';
import { LatencyStats } from './AdvancedAnalytics';
import { Path } from '../../types/network';
import { motion } from 'framer-motion';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface LatencyDistributionProps {
  distribution: LatencyStats;
  paths: Path[];
}

export const LatencyDistribution: React.FC<LatencyDistributionProps> = ({ distribution, paths }) => {
  const chartData = {
    labels: distribution.distribution.map(d => d.range),
    datasets: [
      {
        label: 'Number of Paths',
        data: distribution.distribution.map(d => d.count),
        backgroundColor: 'rgba(79, 70, 229, 0.7)',
        borderColor: 'rgba(79, 70, 229, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Latency Distribution',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        callbacks: {
          title: (context: any) => `Range: ${context[0].label}`,
          label: (context: any) => `Paths: ${context.raw}`,
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Latency Range (ms)',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Number of Paths',
        },
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Percentile Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries({
          'p50': 'Median',
          'p75': '75th Percentile',
          'p90': '90th Percentile',
          'p95': '95th Percentile',
          'p99': '99th Percentile',
        }).map(([key, label], index) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="bg-secondary-50 p-4 rounded-lg"
          >
            <h3 className="text-sm font-medium text-secondary-600">{label}</h3>
            <p className="text-lg font-bold text-secondary-900 mt-1">
              {distribution.percentiles[key as keyof typeof distribution.percentiles].toFixed(1)}ms
            </p>
          </motion.div>
        ))}
      </div>

      {/* Distribution Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="bg-white border border-secondary-200 rounded-lg p-6"
      >
        <div className="h-80">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </motion.div>

      {/* Outliers Analysis */}
      {distribution.outliers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          className="bg-white border border-secondary-200 rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">Latency Outliers</h3>
          <div className="space-y-4">
            {distribution.outliers.slice(0, 10).map((outlier, index) => (
              <motion.div
                key={outlier.region}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.7 + index * 0.05 }}
                className="bg-secondary-50 p-4 rounded-lg flex items-center justify-between"
              >
                <div>
                  <h4 className="font-medium text-secondary-900">{outlier.region}</h4>
                  <p className="text-sm text-secondary-600">Significant latency deviation</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-600">{outlier.latency.toFixed(1)}ms</p>
                  <p className="text-sm text-secondary-600">
                    {outlier.latency > distribution.percentiles.p99 ? 'Critical' : 'Warning'}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Path Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.7 }}
        className="bg-white border border-secondary-200 rounded-lg p-6"
      >
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Path Performance Analysis</h3>
        <PathPerformanceTable paths={paths} distribution={distribution} />
      </motion.div>
    </div>
  );
};

const PathPerformanceTable: React.FC<{ paths: Path[]; distribution: LatencyStats }> = ({ paths, distribution }) => {
  const classifyPerformance = (latency: number) => {
    if (latency <= distribution.percentiles.p50) return { label: 'Excellent', color: 'text-green-600' };
    if (latency <= distribution.percentiles.p75) return { label: 'Good', color: 'text-blue-600' };
    if (latency <= distribution.percentiles.p90) return { label: 'Average', color: 'text-yellow-600' };
    if (latency <= distribution.percentiles.p95) return { label: 'Below Average', color: 'text-orange-600' };
    return { label: 'Poor', color: 'text-red-600' };
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-secondary-200">
        <thead>
          <tr>
            <th className="px-6 py-3 bg-secondary-50 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
              Path
            </th>
            <th className="px-6 py-3 bg-secondary-50 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
              Latency
            </th>
            <th className="px-6 py-3 bg-secondary-50 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
              Hops
            </th>
            <th className="px-6 py-3 bg-secondary-50 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
              Performance
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-secondary-200">
          {paths.map((path, index) => {
            const performance = classifyPerformance(path.latency);
            return (
              <motion.tr
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="hover:bg-secondary-50"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                  {path.route[0]} → {path.route[path.route.length - 1]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                  {path.latency.toFixed(1)}ms
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                  {path.hops}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`font-medium ${performance.color}`}>
                    {performance.label}
                  </span>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
