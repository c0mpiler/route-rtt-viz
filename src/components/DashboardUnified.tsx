/**
 * DashboardUnified - Streamlined dashboard without internal tabs
 * 
 * This component integrates seamlessly with the UnifiedHeader for a
 * consistent navigation experience across the application.
 */
import React, { useMemo, useCallback, Suspense, lazy, useState, useRef } from "react";
import { LoadingIndicator } from "@components/LoadingIndicator";
import { LazyComponent, SectionCard } from "@components/common";
import { Path } from "@hooks/useNetworkGraph";
import { NetworkGraph } from "@utils/network/NetworkGraph";
import { useFilter } from "@context/FilterContext";
import { NetworkData } from "@types/network";
import VirtualRouteList from "@components/ui/VirtualRouteList";
import { FileUploader, DataExporter } from "@components/data-management";
import { usePathCache, useNetworkDataCache, useCacheMonitoring } from "@hooks/useCache";

// Lazy-loaded components for optimal performance
const RouteCard = lazy(() => import("@components/RouteCard").then(module => ({ default: module.RouteCard })));
const LatencyChart = lazy(() => import("@components/LatencyChart").then(module => ({ default: module.LatencyChart })));
const NetworkVisualizer = lazy(() => import("@components/NetworkVisualizer").then(module => ({ default: module.NetworkVisualizer })));
const WorldMapVisualizer = lazy(() => import("@components/WorldMapVisualizer").then(module => ({ default: module.WorldMapVisualizer })));

interface DashboardProps {
  graph: NetworkGraph | null;
  sourceRegion: string | null;
  targetRegion: string | null;
  shortestPaths: Path[];
  longestPathBetweenSelection: Path | null;
  longestPath: Path | null;
  maxLatency: number;
  onRecalculate: () => void;
  onNetworkDataUpdate?: (data: NetworkData) => void;
  mode: 'visualize' | 'upload' | 'export' | 'cache';
}

/**
 * FilterToggle component with count and highlighting
 */
interface FilterToggleProps {
  isActive: boolean;
  isHighlighted: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  color: string;
  label: string;
  count?: number;
}

const FilterToggle: React.FC<FilterToggleProps> = ({
  isActive,
  isHighlighted,
  onClick,
  onDoubleClick,
  color,
  label,
  count
}) => (
  <button
    onClick={onClick}
    onDoubleClick={onDoubleClick}
    className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
      ${isActive 
        ? `${color} text-white shadow-sm` 
        : `bg-secondary-50 text-secondary-700 hover:bg-secondary-100`
      }
      ${isHighlighted ? 'ring-2 ring-offset-1 shadow-lg' : ''}
    `}
    style={isHighlighted ? { ringColor: color.replace('bg-', '') } : {}}
  >
    <div className={`w-2 h-2 rounded-full mr-2 ${isActive ? 'bg-white' : 'bg-current'}`} />
    {label}
    {count !== undefined && (
      <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
        isActive ? 'bg-white/20' : 'bg-secondary-200'
      }`}>
        {count}
      </span>
    )}
  </button>
);

/**
 * Unified Dashboard without internal tabs
 */
export const DashboardUnified: React.FC<DashboardProps> = ({
  graph,
  sourceRegion,
  targetRegion,
  shortestPaths,
  longestPathBetweenSelection,
  longestPath,
  maxLatency,
  onRecalculate,
  onNetworkDataUpdate,
  mode
}) => {
  const [error, setError] = useState<string | null>(null);
  const worldMapRef = useRef<SVGSVGElement>(null);
  const networkVisualizerRef = useRef<SVGSVGElement>(null);
  
  const hasRegionsSelected = Boolean(sourceRegion && targetRegion);
  
  // Get filter state from context
  const { filters, highlightedFilter, toggleFilter, isolateFilter } = useFilter();
  
  // Cache hooks
  const { metrics: cacheMetrics, recommendations: cacheRecommendations } = useCacheMonitoring();
  const { save: saveNetworkData } = useNetworkDataCache();

  // Calculate filtered paths for virtual scrolling
  const filteredPaths = useMemo(() => {
    let paths: Path[] = [];
    
    if (filters.fastest) {
      paths = [...paths, ...shortestPaths.map((path, index) => ({ ...path, type: 'fastest', index }))];
    }
    
    if (filters.longestBetween && longestPathBetweenSelection) {
      paths = [...paths, { ...longestPathBetweenSelection, type: 'longestBetween', index: 0 }];
    }
    
    if (filters.longestOverall && longestPath) {
      paths = [...paths, { ...longestPath, type: 'longestOverall', index: 1 }];
    }
    
    return paths;
  }, [filters, shortestPaths, longestPathBetweenSelection, longestPath]);

  const handleFileUpload = useCallback(async (data: NetworkData) => {
    try {
      await saveNetworkData(data);
      if (onNetworkDataUpdate) {
        onNetworkDataUpdate(data);
      }
      setError(null);
    } catch (err) {
      setError('Failed to save uploaded network data');
      console.error(err);
    }
  }, [saveNetworkData, onNetworkDataUpdate]);

  const handleUploadError = useCallback((err: Error) => {
    setError(err.message);
  }, []);

  if (mode === 'visualize') {
    return (
      <div className="flex flex-col gap-6">
        {/* Compact filter controls at top */}
        {hasRegionsSelected && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-lg shadow-sm">
            <FilterToggle
              isActive={filters.fastest}
              isHighlighted={highlightedFilter === 'fastest'}
              onClick={() => toggleFilter('fastest')}
              onDoubleClick={() => isolateFilter('fastest')}
              color="bg-cyan-600"
              label="Fastest"
              count={shortestPaths.length}
            />
            <FilterToggle
              isActive={filters.alternative}
              isHighlighted={highlightedFilter === 'alternative'}
              onClick={() => toggleFilter('alternative')}
              onDoubleClick={() => isolateFilter('alternative')}
              color="bg-indigo-600"
              label="Alternative"
            />
            <FilterToggle
              isActive={filters.longestBetween}
              isHighlighted={highlightedFilter === 'longestBetween'}
              onClick={() => toggleFilter('longestBetween')}
              onDoubleClick={() => isolateFilter('longestBetween')}
              color="bg-amber-600"
              label="Longest Selected"
              count={longestPathBetweenSelection ? 1 : 0}
            />
            <FilterToggle
              isActive={filters.longestOverall}
              isHighlighted={highlightedFilter === 'longestOverall'}
              onClick={() => toggleFilter('longestOverall')}
              onDoubleClick={() => isolateFilter('longestOverall')}
              color="bg-rose-600"
              label="Overall Longest"
            />
          </div>
        )}

        {/* Geographic View - Full width */}
        <SectionCard
          title="Geographic Overview"
          className="w-full"
        >
          <div style={{ height: '500px' }} className="rounded overflow-hidden">
            <LazyComponent
              component={
                <WorldMapVisualizer
                  ref={worldMapRef}
                  graph={graph}
                  paths={filters.fastest ? shortestPaths : []}
                  longestPath={filters.longestOverall ? longestPath : null}
                  longestPathBetween={filters.longestBetween ? longestPathBetweenSelection : null}
                  sourceRegion={sourceRegion}
                  targetRegion={targetRegion}
                />
              }
              loadingMessage="Loading world map..."
            />
          </div>
        </SectionCard>

        {/* Network Paths - Virtual scrolling */}
        <SectionCard
          title="Network Paths"
        >
          {hasRegionsSelected ? (
            filteredPaths.length > 0 ? (
              <div style={{ height: '600px' }}>
                <VirtualRouteList
                  paths={filteredPaths}
                  maxLatency={maxLatency}
                  itemHeight={150}
                  visibleItems={5}
                  longestPathIndex={filteredPaths.findIndex(p => p.type === 'longestOverall')}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <p className="text-secondary-600 text-base">
                  No paths found with current filters
                </p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <p className="text-secondary-600 text-base">
                Select source and target regions to explore paths
              </p>
            </div>
          )}
        </SectionCard>

        {/* Latency Analysis - Full width */}
        <SectionCard
          title="Latency Analysis"
        >
          {shortestPaths.length > 0 ? (
            <LazyComponent
              component={
                <LatencyChart
                  paths={shortestPaths}
                  longestPath={longestPath}
                  longestPathBetween={longestPathBetweenSelection}
                />
              }
              loadingMessage="Loading latency chart..."
              minHeight="400px"
            />
          ) : (
            <div className="py-12 text-center text-secondary-600">
              {hasRegionsSelected 
                ? "No paths available for analysis"
                : "Select regions to view latency analysis"
              }
            </div>
          )}
        </SectionCard>

        {/* Network Topology - Full width */}
        <SectionCard
          title="Network Topology"
        >
          <div style={{ height: '600px' }} className="rounded bg-white">
            <LazyComponent
              component={
                <NetworkVisualizer
                  ref={networkVisualizerRef}
                  graph={graph}
                  paths={filters.fastest ? shortestPaths : []}
                  longestPath={filters.longestOverall ? longestPath : null}
                  longestPathBetween={filters.longestBetween ? longestPathBetweenSelection : null}
                  sourceRegion={sourceRegion}
                  targetRegion={targetRegion}
                />
              }
              loadingMessage="Loading network visualization..."
            />
          </div>
        </SectionCard>
      </div>
    );
  }

  if (mode === 'upload') {
    return (
      <div className="max-w-4xl mx-auto">
        <SectionCard
          title="Upload Network Data"
          description="Upload your own RTT (Round-Trip Time) data to visualize network latency"
        >
          <FileUploader
            onDataLoaded={handleFileUpload}
            onError={handleUploadError}
          />
          {error && (
            <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
              <p className="font-medium">Error processing file</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
        </SectionCard>
      </div>
    );
  }

  if (mode === 'export') {
    return (
      <div className="max-w-4xl mx-auto">
        <SectionCard
          title="Export Data and Visualizations"
          description="Export path analysis and network visualizations in various formats"
        >
          <DataExporter
            paths={filteredPaths}
            selectedRegions={hasRegionsSelected ? { source: sourceRegion!, target: targetRegion! } : null}
            networkData={graph?.networkData || {}}
            visualizationRef={worldMapRef.current ? worldMapRef : networkVisualizerRef}
          />
        </SectionCard>
      </div>
    );
  }

  if (mode === 'cache') {
    return (
      <div className="max-w-4xl mx-auto">
        <SectionCard
          title="Cache Management"
          description="Monitor and manage persistent cache performance"
        >
          {cacheMetrics && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-secondary-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-secondary-600">Hit Rate</h3>
                  <p className="text-2xl font-bold text-secondary-900">
                    {cacheMetrics.hitRate?.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-secondary-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-secondary-600">Cache Size</h3>
                  <p className="text-2xl font-bold text-secondary-900">
                    {cacheMetrics.size || 0} items
                  </p>
                </div>
                <div className="bg-secondary-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-secondary-600">Total Hits</h3>
                  <p className="text-2xl font-bold text-secondary-900">
                    {cacheMetrics.hits || 0}
                  </p>
                </div>
                <div className="bg-secondary-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-secondary-600">Total Misses</h3>
                  <p className="text-2xl font-bold text-secondary-900">
                    {cacheMetrics.misses || 0}
                  </p>
                </div>
              </div>
              
              {cacheRecommendations && cacheRecommendations.length > 0 && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                  <h3 className="text-lg font-medium text-blue-900 mb-2">Recommendations</h3>
                  <ul className="list-disc list-inside text-blue-800 space-y-1">
                    {cacheRecommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </SectionCard>
      </div>
    );
  }

  return null;
};

export default DashboardUnified;
