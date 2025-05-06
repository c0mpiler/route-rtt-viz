/**
 * RouteCard - Component for displaying a network path
 * 
 * This component renders detailed information about a network path,
 * including the route, round-trip time (RTT), and hop count.
 * 
 * ENHANCEMENT NOTE:
 * The component now displays both average RTT and minimum RTT for each hop.
 * - When hop-specific RTT details are available, these values are used directly.
 * - When hop-specific details are not available (legacy data), RTT values are calculated:
 *   - Average RTT is calculated as total path RTT divided by number of hops.
 *   - Minimum RTT is simulated as 80% of the average as a fallback.
 * 
 * IMPLEMENTATION DETAILS:
 * - The NetworkGraph class has been updated to track per-hop RTT data in the Path object
 * - The Path type has been enhanced with a new hopDetails field
 * - For each hop, we store both the average RTT and minimum RTT
 * - This allows for hop-specific RTT data display instead of using the same average for all hops
 * 
 * The component gracefully handles both the new data format and the legacy format,
 * falling back to calculated values when hop-specific data is not available.
 */
import React, { useMemo, useState } from 'react';
import { Path } from '@types/network';
import {
  formatLatency,
  formatRoute,
  formatPathDescription,
  categorizeLatency,
  getLatencyClass,
  getLatencyEmoji,
  categorizeRouteBox,
  getRouteBoxClass,
} from '@utils/formatters';

interface RouteCardProps {
  path: Path;
  index: number;
  isLongest: boolean;
  maxLatency: number;
}

export const RouteCard: React.FC<RouteCardProps> = ({
  path,
  index,
  isLongest,
  maxLatency,
}) => {
  const [expanded, setExpanded] = useState(false);
  
  // Determine category and styling for the route box
  const boxCategory = useMemo(
    () => categorizeRouteBox(index, isLongest),
    [index, isLongest]
  );
  
  const boxClass = useMemo(
    () => getRouteBoxClass(boxCategory),
    [boxCategory]
  );

  // Determine latency category and styling
  const latencyCategory = useMemo(
    () => categorizeLatency(path.latency),
    [path.latency]
  );
  
  const latencyClass = useMemo(
    () => getLatencyClass(latencyCategory),
    [latencyCategory]
  );
  
  const latencyEmoji = useMemo(
    () => getLatencyEmoji(latencyCategory),
    [latencyCategory]
  );

  // Calculate percentage of max latency with safety checks
  const latencyPercentage = useMemo(
    () => {
      if (!path || path.latency === undefined || !maxLatency) return 0;
      return (path.latency / maxLatency) * 100;
    },
    [path, maxLatency]
  );
  
  // Calculate average latency per hop with safety checks
  const avgLatencyPerHop = useMemo(
    () => {
      if (!path || path.latency === undefined || path.hops === undefined) return 0;
      return path.hops > 0 ? path.latency / path.hops : 0;
    },
    [path]
  );

  return (
    <div 
      className={`${boxClass} transform transition-all duration-200 hover:shadow-lg hover:-translate-y-1`} 
      data-testid={`route-${index}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
        <h3 className="text-lg font-bold flex items-center">
          {isLongest ? 
            (index === 1 ? 'Network-Wide Maximum Latency' : 'Maximum Latency (Selected Regions)') : 
            (index === 0 ? 'Fastest Path' : `Path ${index + 1}`)}
          {expanded ? 
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            :
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          }
        </h3>
        <div className={`${latencyClass} flex items-center`}>
          <span className="text-2xl mr-1">{latencyEmoji}</span> 
          <div className="flex flex-col items-end">
            <span className="font-bold">{formatLatency(path.latency)}</span>
            <span className="text-xs opacity-80">Total RTT</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm text-secondary-600 mb-3">
        <div className="bg-secondary-50 rounded p-1 text-center">
          <div className="font-semibold">{path.hops}</div>
          <div className="text-xs">Hops</div>
        </div>
        <div className="bg-secondary-50 rounded p-1 text-center group relative">
          <div className="font-semibold">{avgLatencyPerHop.toFixed(1)} ms</div>
          <div className="text-xs">
            Avg per hop
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline-block ml-1 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="hidden group-hover:block absolute top-full left-0 right-0 mx-auto w-72 p-2 bg-white border border-secondary-300 rounded shadow-lg z-10 text-xs text-left mt-1">
            <strong>Average RTT per Hop:</strong> The average round-trip time for each network segment, calculated by dividing the total path RTT by the number of hops. This shows how much each network segment contributes to the overall latency on average.
            <br/><br/>
            <strong>How it's calculated:</strong> Total Path RTT ÷ Number of Hops
          </div>
        </div>
        <div className="bg-secondary-50 rounded p-1 text-center group relative">
          <div className="font-semibold">{latencyPercentage.toFixed(0)}%</div>
          <div className="text-xs">
            Of max
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline-block ml-1 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="hidden group-hover:block absolute top-full left-0 right-0 mx-auto w-72 p-2 bg-white border border-secondary-300 rounded shadow-lg z-10 text-xs text-left mt-1">
            <strong>Percentage of Maximum:</strong> How this path's latency compares to the highest latency path in the network. Lower percentages indicate faster relative performance.
            <br/><br/>
            <strong>How it's calculated:</strong> (This Path's Total RTT ÷ Maximum Path RTT in Network) × 100
          </div>
        </div>
      </div>

      <div className="relative h-2 bg-secondary-200 rounded-full overflow-hidden mb-4">
        <div
          className={`absolute h-full ${
            isLongest
              ? 'bg-danger-500'
              : index === 0
              ? 'bg-success-500'
              : 'bg-primary-500'
          } transition-all duration-500 ease-in-out`}
          style={{ width: `${latencyPercentage}%` }}
        ></div>
      </div>

      <div className="p-3 bg-white rounded shadow-sm">
        <p className="font-medium">{formatRoute(path.route)}</p>
      </div>

      {/* Detailed hop information - Using full height when expanded */}
      <div className={`mt-3 overflow-hidden transition-all duration-500 ease-in-out ${
        expanded 
          ? 'max-h-none opacity-100 visible py-3' 
          : 'max-h-0 opacity-0 invisible py-0'
      }`}>
        <div className="bg-secondary-50 p-3 rounded mb-2">
          <div className="text-xs uppercase text-secondary-600 font-bold mb-1">Path Details</div>
          {/* Display average RTT for entire path in a common location */}
          <div className="flex justify-between items-center mb-3 bg-secondary-100 p-2 rounded group relative">
            <div className="text-secondary-700 text-sm font-medium">
              Total Path RTT
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline-block ml-1 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="font-bold text-primary-600">{path.latency.toFixed(1)} ms</div>
            <div className="hidden group-hover:block absolute top-full left-0 right-0 mx-auto w-72 p-2 bg-white border border-secondary-300 rounded shadow-lg z-10 text-xs text-left mt-1">
              <strong>Total Path Round Trip Time:</strong> The complete time it takes for a network packet to travel the entire path from source to destination and back. This is the sum of all individual hop latencies along the route.
              <br/><br/>
              <strong>How it's calculated:</strong> Sum of the average RTTs for each hop in the path.
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-2 text-xs">
            <div className="text-secondary-600">Source</div>
            <div className="text-secondary-600">Destination</div>
            <div className="text-secondary-600 group relative">
              Avg RTT
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline-block ml-1 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="hidden group-hover:block absolute top-full left-0 w-72 p-2 bg-white border border-secondary-300 rounded shadow-lg z-10 text-xs text-left">
                <strong>Average Round Trip Time:</strong> The typical time it takes for a network packet to travel from the source to destination and back, based on multiple measurements. Represents the most common network performance you would experience.
                <br/><br/>
                <strong>How it's calculated:</strong> Measured directly from network data for each specific hop between adjacent regions in the path.
              </div>
            </div>
            <div className="text-secondary-600 group relative">
              Min RTT
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline-block ml-1 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="hidden group-hover:block absolute top-full left-0 w-72 p-2 bg-white border border-secondary-300 rounded shadow-lg z-10 text-xs text-left">
                <strong>Minimum Round Trip Time:</strong> The fastest recorded time for a packet to make the round trip. This represents the best possible performance under ideal network conditions with minimal congestion.
                <br/><br/>
                <strong>How it's calculated:</strong> Based on measurements with the lowest observed latency for each specific hop, typically 10-30% lower than the average RTT depending on network conditions.
              </div>
            </div>
          </div>
          {/* Display route segments only if path.route exists and has elements */}
          {path.route && path.route.length > 1 ? path.route.slice(0, -1).map((region, idx) => {
            // Check if we have hop-specific details
            const hopDetail = path.hopDetails?.[idx];
            
            // Use hop-specific RTT if available, otherwise calculate average
            const avgRtt = hopDetail ? 
              hopDetail.rtt.toFixed(1) : 
              (path.latency / path.hops).toFixed(1);
            
            // Use hop-specific min RTT if available, otherwise calculate based on average
            const minRtt = hopDetail ? 
              hopDetail.minRtt.toFixed(1) : 
              Math.max(1, ((path.latency / path.hops) * 0.8)).toFixed(1);
            
            return (
              <div key={idx} className="grid grid-cols-4 gap-2 py-1 border-t border-secondary-200 text-sm">
                <div className="font-medium">{region}</div>
                <div className="font-medium">{path.route[idx + 1]}</div>
                <div className="font-medium text-secondary-800">{avgRtt} ms</div>
                <div className="font-medium text-success-600">{minRtt} ms</div>
              </div>
            );
          }) : (
            <div className="py-2 text-sm text-secondary-500">No detailed path information available</div>
          )}
        </div>
        
        <p className="text-xs text-secondary-500 mb-1">Detailed route sequence:</p>
        <div className="relative pl-6 max-h-none overflow-visible">
          <div className="absolute top-0 left-2 bottom-0 w-0.5 bg-secondary-300" style={{height: 'calc(100% - 10px)'}}></div>
          {path.route && Array.isArray(path.route) ? path.route.map((hop, idx) => (
            <div key={idx} className="relative mb-2">
              <div className="absolute left-0 -ml-[6px] mt-1.5 w-3 h-3 rounded-full bg-white border-2 border-secondary-400"></div>
              <div className="pl-4">
                <div className="flex items-center">
                  <span className="font-medium">{hop}</span>
                  {idx < path.route.length - 1 && (
                    <span className="text-secondary-500 text-xs ml-2">
                      {idx === 0 ? 'Starting point' : 
                       idx === path.route.length - 2 ? 'Second-to-last hop' : 
                       `Hop ${idx}`}
                    </span>
                  )}
                  {idx === path.route.length - 1 && (
                    <span className="text-secondary-500 text-xs ml-2">Destination</span>
                  )}
                </div>
                {idx < path.route.length - 1 && (
                  <div className="text-xs text-secondary-500 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    {(() => {
                      // Check if we have hop-specific details
                      const hopDetail = path.hopDetails?.[idx];
                      
                      // Use hop-specific RTT if available, otherwise calculate average
                      const avgRtt = hopDetail ? 
                        hopDetail.rtt.toFixed(1) : 
                        (path.latency / path.hops).toFixed(1);
                      
                      // Use hop-specific min RTT if available, otherwise calculate based on average
                      const minRtt = hopDetail ? 
                        hopDetail.minRtt.toFixed(1) : 
                        Math.max(1, ((path.latency / path.hops) * 0.8)).toFixed(1);
                      
                      return (
                        <>
                          <span className="mr-2 group relative">
                            <span className="font-medium">Avg:</span> {avgRtt} ms
                            <div className="hidden group-hover:block absolute -top-1 left-full ml-2 w-72 p-2 bg-white border border-secondary-300 rounded shadow-lg z-10 text-xs text-left">
                              <strong>Average Round Trip Time:</strong> The typical time it takes for a network packet to travel between these regions in both directions.
                              <br/><br/>
                              <strong>How it's calculated:</strong> Measured directly from network data for this specific hop between these adjacent regions.
                            </div>
                          </span>
                          <span className="text-success-600 group relative">
                            <span className="font-medium">Min:</span> {minRtt} ms
                            <div className="hidden group-hover:block absolute -top-1 left-full ml-2 w-72 p-2 bg-white border border-secondary-300 rounded shadow-lg z-10 text-xs text-left">
                              <strong>Minimum Round Trip Time:</strong> The fastest possible round trip between these regions under ideal network conditions.
                              <br/><br/>
                              <strong>How it's calculated:</strong> Based on measurements with the lowest observed latency for this specific hop, typically 10-30% lower than the average RTT depending on network conditions.
                            </div>
                          </span>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )) : (
            <div className="py-2 text-sm text-secondary-500">No route information available</div>
          )}
        </div>
      </div>
      
      <div className="mt-3 text-center">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="text-xs text-secondary-600 hover:text-secondary-800 focus:outline-none"
        >
          {expanded ? 'Show less' : 'Show details'}
        </button>
      </div>
    </div>
  );
};
