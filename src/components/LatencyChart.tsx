import React, { useMemo } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Path } from '@types/network';
import { formatRoute } from '@utils/formatters';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend
);

interface LatencyChartProps {
  paths: Path[];
  longestPath: Path | null;
  longestPathBetween: Path | null; // The longest path between selected regions
}

export const LatencyChart: React.FC<LatencyChartProps> = ({ 
  paths, 
  longestPath,
  longestPathBetween
}) => {
  // Get max latency value for reference
  const allPathsForTooltip = useMemo(() => {
    const allPaths = [...paths];
    if (longestPath) allPaths.push(longestPath);
    if (longestPathBetween) allPaths.push(longestPathBetween);
    return allPaths;
  }, [paths, longestPath, longestPathBetween]);
  
  const maxLatencyValue = useMemo(() => {
    return Math.max(...allPathsForTooltip.map(p => p.latency));
  }, [allPathsForTooltip]);
  
  // Prepare data for the chart
  const chartData = useMemo(() => {
    // Ensure paths is an array
    const validPaths = Array.isArray(paths) ? paths : [];
    const allPaths = [...validPaths];
    
    // Add overall longest path if it exists and is not already included
    if (longestPath && longestPath.route) {
      const isLongestIncluded = validPaths.some(
        path => path.route && longestPath.route && 
              path.route.join() === longestPath.route.join()
      );
      
      if (!isLongestIncluded) {
        allPaths.push(longestPath);
      }
    }
    
    // Add longest path between selected regions if it exists and is not already included
    if (longestPathBetween && longestPathBetween.route) {
      const isLongestBetweenIncluded = allPaths.some(
        path => path.route && longestPathBetween.route && 
              path.route.join() === longestPathBetween.route.join()
      );
      
      if (!isLongestBetweenIncluded) {
        allPaths.push(longestPathBetween);
      }
    }

    // Sort paths by latency for better visualization
    allPaths.sort((a, b) => a.latency - b.latency);
    
    // Enhanced path labeling
    const enhancedLabels = allPaths.map((path, index) => {
      let label = '';
      
      // Add path type to label
      if (longestPath && path.route && longestPath.route && 
          path.route.join() === longestPath.route.join()) {
        label = '🌐 Overall Longest: ';
      } else if (longestPathBetween && path.route && longestPathBetween.route && 
                 path.route.join() === longestPathBetween.route.join()) {
        label = '🔄 Longest Between: ';
      } else if (index === 0) {
        label = '⚡ Fastest: '; 
      } else {
        label = `▫️ Path ${index}: `;
      }
      
      // Add shortened route
      const routeText = formatRoute(path.route);
      const shortenedRoute = routeText.length > 30 ? routeText.substring(0, 27) + '...' : routeText;
      
      return `${label}${shortenedRoute}`;
    });
    
    return {
      labels: enhancedLabels,
      datasets: [
        {
          label: 'Latency (ms)',
          data: allPaths.map(path => path.latency),
          backgroundColor: allPaths.map((path, index) => {
            // Color for overall longest path (red)
            if (longestPath && path.route && longestPath.route && 
                path.route.join() === longestPath.route.join()) {
              return 'rgba(239, 68, 68, 0.8)'; // Red for overall longest path
            }
            
            // Color for longest path between selected regions (orange)
            if (longestPathBetween && path.route && longestPathBetween.route && 
                path.route.join() === longestPathBetween.route.join()) {
              return 'rgba(245, 158, 11, 0.8)'; // Orange for longest path between selected
            }
            
            // Gradient for shortest paths
            if (index === 0) return 'rgba(16, 185, 129, 0.8)'; // Green for fastest
            if (index === 1) return 'rgba(59, 130, 246, 0.8)'; // Blue for second
            if (index === 2) return 'rgba(234, 179, 8, 0.8)'; // Yellow for third
            
            return 'rgba(139, 92, 246, 0.8)'; // Purple for others
          }),
          borderColor: allPaths.map((path, index) => {
            // Border color for overall longest path (dark red)
            if (longestPath && path.route && longestPath.route && 
                path.route.join() === longestPath.route.join()) {
              return 'rgb(185, 28, 28)'; // Dark red for overall longest path
            }
            
            // Border color for longest path between selected regions (dark orange)
            if (longestPathBetween && path.route && longestPathBetween.route && 
                path.route.join() === longestPathBetween.route.join()) {
              return 'rgb(180, 83, 9)'; // Dark orange for longest path between selected
            }
            
            if (index === 0) return 'rgb(4, 120, 87)'; // Dark green for fastest
            if (index === 1) return 'rgb(29, 78, 216)'; // Dark blue for second
            if (index === 2) return 'rgb(161, 98, 7)'; // Dark yellow for third
            
            return 'rgb(109, 40, 217)'; // Dark purple for others
          }),
          borderWidth: 1,
          borderRadius: 6,
          hoverBorderWidth: 2,
          hoverBorderColor: '#000',
        },
      ],
    };
  }, [paths, longestPath, longestPathBetween]);

  // Chart options
  const barOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 14,
          weight: 'bold' as const
        },
        bodyFont: {
          size: 13
        },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          afterTitle: function(context: any) {
            const index = context[0].dataIndex;
            // Get the current path using the memoized allPathsForTooltip array
            const path = allPathsForTooltip[index];
            if (!path) return '';
            
            let pathTypeName = '';
            // Add path type information
            if (longestPath && path.route && longestPath.route &&
                path.route.join() === longestPath.route.join()) {
              pathTypeName = "Overall Longest Path";
            } else if (longestPathBetween && path.route && longestPathBetween.route &&
                      path.route.join() === longestPathBetween.route.join()) {
              pathTypeName = "Longest Path Between Selected Regions";
            } else if (index === 0) {
              pathTypeName = "Fastest Path";
            } else {
              pathTypeName = `Path ${index + 1}`;
            }
            
            return pathTypeName;
          },
          afterLabel: function(context: any) {
            const index = context.dataIndex;
            
            // Get current path using the memoized allPathsForTooltip array
            const path = allPathsForTooltip[index];
            if (!path) return '';
            
            const hops = path.hops;
            const avgPerHop = path.latency / Math.max(1, hops);
            const percentOfMax = ((path.latency / maxLatencyValue) * 100).toFixed(1);
            
            const routeStr = path.route && Array.isArray(path.route) 
              ? path.route.join(' → ')
              : 'Route unavailable';
            
            return [
              `${hops} ${hops === 1 ? 'hop' : 'hops'}`,
              `Avg per hop: ${avgPerHop.toFixed(1)} ms`,
              `${percentOfMax}% of max latency`,
              `Route: ${routeStr}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Latency (ms)',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        },
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          callback: function(value: any) {
            return value + ' ms';
          }
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          callback: function(value: any) {
            const label = this.getLabelForValue(value);
            // Show only the path type prefix
            if (label && label.includes(':')) {
              return label.split(':')[0];
            }
            // Truncate long labels for Y axis
            return label.length > 20 ? label.substring(0, 17) + '...' : label;
          }
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    }
  };

  return (
    <div className="flex flex-col">
      <div className="h-80 md:h-96">
        <Bar data={chartData} options={barOptions} />
      </div>
      
      <div className="mt-4 bg-secondary-50 p-3 rounded text-sm">
        <h4 className="font-semibold mb-2 text-secondary-800">Chart Legend</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-green-600 mr-2"></span>
            <span>Fastest Path</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-600 mr-2"></span>
            <span>Alternative Paths</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-2"></span>
            <span>Longest Path Between Selected</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-red-600 mr-2"></span>
            <span>Overall Longest Path</span>
          </div>
        </div>
      </div>
    </div>
  );
};
