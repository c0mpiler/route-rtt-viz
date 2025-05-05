/**
 * FilterableLegend - Interactive legend component with filter controls
 * 
 * This component displays a map legend with clickable items that
 * control which path types are displayed in the visualizations.
 */
import React from 'react';
import { PathFilter, useFilter } from '@context/FilterContext';

interface LegendItem {
  id: PathFilter;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description?: string;
}

// Beautiful color palette matching the improved visualization
const colors = {
  source: 'bg-emerald-600',
  fastest: 'bg-cyan-500',
  alternative: 'bg-indigo-600',
  longestBetween: 'bg-amber-500',
  longestOverall: 'bg-rose-700',
};

interface FilterableLegendProps {
  showInteractionTips?: boolean;
  sourceRegion?: string | null;
  targetRegion?: string | null;
  /** Callback to handle when overall longest path is selected */
  onOverallLongestPathSelected?: () => void;
  /** Callback to handle when selection is reset or changed */
  onSelectionReset?: () => void;
}

/**
 * Interactive map legend with filter controls
 */
export const FilterableLegend: React.FC<FilterableLegendProps> = ({ 
  showInteractionTips = true,
  sourceRegion,
  targetRegion,
  onOverallLongestPathSelected,
  onSelectionReset
}) => {
  // Access filter context
  const { filters, toggleFilter, isolateFilter, resetFilters, highlightedFilter } = useFilter();
  
  // Legend items definition
  const legendItems: LegendItem[] = [
    {
      id: 'fastest',
      label: 'Source Region / Fastest Path',
      color: colors.fastest,
      bgColor: 'bg-cyan-500/5',
      borderColor: 'border-cyan-500',
      description: 'The shortest and fastest path with minimal latency'
    },
    {
      id: 'alternative',
      label: 'Alternative Paths',
      color: colors.alternative,
      bgColor: 'bg-indigo-600/5',
      borderColor: 'border-indigo-600',
      description: 'Other valid paths with varying latency'
    },
    {
      id: 'longestBetween',
      label: `Longest Path Between${sourceRegion && targetRegion ? ` ${sourceRegion} and ${targetRegion}` : ''}`,
      color: colors.longestBetween,
      bgColor: 'bg-amber-500/5',
      borderColor: 'border-amber-500',
      description: 'The longest/worst-case path between selected regions'
    },
    {
      id: 'longestOverall',
      label: 'Overall Longest Path',
      color: colors.longestOverall,
      bgColor: 'bg-rose-700/5',
      borderColor: 'border-rose-700',
      description: 'The overall longest path across the entire network'
    }
  ];
  
  // Function to get legend item class based on its state
  const getLegendItemClass = (item: LegendItem) => {
    // Base classes for all items
    const baseClasses = "flex items-center p-2 rounded cursor-pointer transition-all";
    
    // If this item is being highlighted exclusively
    if (highlightedFilter === item.id) {
      return `${baseClasses} border-2 ${item.borderColor} ${item.bgColor} shadow-md`;
    }
    
    // If a different item is being highlighted, and this one isn't
    if (highlightedFilter && highlightedFilter !== item.id) {
      return `${baseClasses} opacity-30 border border-transparent`;
    }
    
    // Normal toggle state (when no item is exclusively highlighted)
    if (filters[item.id]) {
      return `${baseClasses} border ${item.borderColor} ${item.bgColor}`;
    }
    
    // Inactive state
    return `${baseClasses} opacity-50 border border-transparent`;
  };
  
  // Enhanced click handler
  const handleLegendItemClick = (item: LegendItem) => {
    // If this item is currently highlighted and clicked again, remove highlight
    if (highlightedFilter === item.id) {
      resetFilters(); // Reset to show all paths
      onSelectionReset?.(); // Notify parent to restore original regions
      return;
    }
    
    // If an item is clicked, highlight only that path
    isolateFilter(item.id);
    
    // Handle special case for overall longest path
    if (item.id === 'longestOverall') {
      onOverallLongestPathSelected?.();
    } else if (item.id !== 'fastest') { // For any other non-fastest filter, reset regions
      onSelectionReset?.();
    }
  };
  
  return (
    <div className="bg-secondary-50 p-4 rounded-lg text-sm shadow-lg border border-secondary-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-secondary-800">Map Legend</h3>
        <div className="flex space-x-2">
          <button 
            onClick={() => {
              resetFilters();
              onSelectionReset?.();
            }}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              highlightedFilter 
                ? 'bg-primary-600 hover:bg-primary-700 text-white font-medium' 
                : 'bg-secondary-200 hover:bg-secondary-300 text-secondary-800'
            }`}
            title="Show all paths"
          >
            {highlightedFilter ? 'Reset View' : 'Show All'}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-2 gap-3 mb-4">
        {legendItems.map(item => (
          <div 
            key={item.id}
            className={getLegendItemClass(item)}
            onClick={() => handleLegendItemClick(item)}
            onDoubleClick={() => isolateFilter(item.id)}
            title={`Click to highlight only this path type. ${item.description}`}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                <span className={`inline-block w-4 h-4 rounded-full ${
                  highlightedFilter === item.id 
                    ? `${item.color} ring-2 ring-white animate-pulse` 
                    : item.color
                }`}></span>
              </div>
              <span className={`ml-2 ${highlightedFilter === item.id ? 'font-medium' : ''}`}>
                {item.label}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {showInteractionTips && (
        <div className="mt-4 text-secondary-600 bg-white p-3 rounded border border-secondary-200">
          <h4 className="font-medium text-secondary-800 mb-1">
            Legend Interaction:
          </h4>
          <ul className="list-disc list-inside space-y-1">
            <li><span className="font-medium">Click</span> on an item to highlight just that path</li>
            <li><span className="font-medium">Click again</span> on a highlighted item to show all paths</li>
            <li>Use <span className="font-medium">{highlightedFilter ? 'Reset View' : 'Show All'}</span> to reset the visualization</li>
          </ul>
        </div>
      )}
    </div>
  );
};
