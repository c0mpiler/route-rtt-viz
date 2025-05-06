/**
 * Dashboard - Consolidated view of all visualizations and data
 * 
 * This component provides a unified dashboard experience with optimized layout
 * for maximum visualization space and minimal control overhead.
 */
import React, { useMemo, useCallback, Suspense, lazy } from "react";
import { LoadingIndicator } from "@components/LoadingIndicator";
import { LazyComponent, SectionCard } from "@components/common";
import { Path } from "@hooks/useNetworkGraph";
import { NetworkGraph } from "@utils/network/NetworkGraph";
import { AdvancedAnalytics } from "@components/analytics";
import { useFilter } from "@context/FilterContext";

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
}

/**
 * Compact filter toggle component
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
 * Dashboard component with optimized layout
 */
export const Dashboard: React.FC<DashboardProps> = ({
  graph,
  sourceRegion,
  targetRegion,
  shortestPaths,
  longestPathBetweenSelection,
  longestPath,
  maxLatency,
  onRecalculate
}) => {
  const hasRegionsSelected = Boolean(sourceRegion && targetRegion);
  
  // Get filter state from context
  const { filters, highlightedFilter, toggleFilter, isolateFilter, setHighlight } = useFilter();

  const renderPathCards = useCallback(() => {
    if (!hasRegionsSelected) {
      return (
        <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-lg shadow-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-primary-500 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <p className="text-secondary-600 text-base">
            Select source and target regions to explore paths
          </p>
        </div>
      );
    }

    if (shortestPaths.length === 0) {
      return (
        <div className="col-span-full flex flex-col items-center justify-center py-16 bg-red-50 rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-red-500 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-red-600 text-base mb-4">
            No paths found between {sourceRegion} and {targetRegion}
          </p>
          <button
            onClick={onRecalculate}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-150"
          >
            Recalculate Paths
          </button>
        </div>
      );
    }

    return (
      <>
        {/* Fastest path - only the first path in shortestPaths */}
        {filters.fastest && shortestPaths.length > 0 && (
          <div key="fastest-path" className="col-span-full">
            <LazyComponent
              component={
                <RouteCard
                  path={shortestPaths[0]}
                  index={0}
                  isLongest={false}
                  maxLatency={maxLatency}
                />
              }
              loadingMessage="Loading path details..."
            />
          </div>
        )}
        
        {/* Alternative paths - all paths after the first */}
        {filters.alternative && shortestPaths.slice(1).map((path, index) => (
          <div key={`alternative-path-${index}`} className="col-span-full">
            <LazyComponent
              component={
                <RouteCard
                  path={path}
                  index={index + 1}
                  isLongest={false}
                  maxLatency={maxLatency}
                />
              }
              loadingMessage="Loading path details..."
            />
          </div>
        ))}

        {/* Longest path between selected regions */}
        {filters.longestBetween && longestPathBetweenSelection && (
          <div className="col-span-full">
            <LazyComponent
              component={
                <RouteCard
                  path={longestPathBetweenSelection}
                  index={0}
                  isLongest={true}
                  maxLatency={maxLatency}
                />
              }
              loadingMessage="Loading longest path details..."
            />
          </div>
        )}

        {/* Overall longest path */}
        {filters.longestOverall && longestPath && (
          <div className="col-span-full">
            <LazyComponent
              component={
                <RouteCard
                  path={longestPath}
                  index={1}
                  isLongest={true}
                  maxLatency={maxLatency}
                />
              }
              loadingMessage="Loading longest path details..."
            />
          </div>
        )}
      </>
    );
  }, [shortestPaths, longestPathBetweenSelection, longestPath, sourceRegion, targetRegion, maxLatency, hasRegionsSelected, filters, onRecalculate]);

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
            count={shortestPaths.length > 1 ? shortestPaths.length - 1 : 0}
          />
          <FilterToggle
            isActive={filters.longestBetween}
            isHighlighted={highlightedFilter === 'longestBetween'}
            onClick={() => toggleFilter('longestBetween')}
            onDoubleClick={() => isolateFilter('longestBetween')}
            color="bg-amber-600"
            label="Maximum (Selected)"
            count={longestPathBetweenSelection ? 1 : 0}
          />
          <FilterToggle
            isActive={filters.longestOverall}
            isHighlighted={highlightedFilter === 'longestOverall'}
            onClick={() => toggleFilter('longestOverall')}
            onDoubleClick={() => isolateFilter('longestOverall')}
            color="bg-rose-600"
            label="Network Maximum"
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

      {/* Network Paths - full width layout */}
      <SectionCard
        title="Network Paths"
      >
        <div className="flex flex-col gap-4">
          {renderPathCards()}
        </div>
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
};
