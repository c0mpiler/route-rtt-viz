/**
 * FilterContext - Context for managing map visualization filters
 * 
 * This module provides a context-based state management system for
 * path visibility filters across different visualization components.
 */
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

// Available filter types matching path categories
export type PathFilter = 'fastest' | 'alternative' | 'longestBetween' | 'longestOverall';

// Default state - all paths visible
const DEFAULT_FILTERS = {
  fastest: true,
  alternative: true,
  longestBetween: true,
  longestOverall: true
};

// Context type definition
interface FilterContextType {
  // Current filter state
  filters: Record<PathFilter, boolean>;
  
  // Currently highlighted filter (if any)
  highlightedFilter: PathFilter | null;
  
  // Toggle a specific filter
  toggleFilter: (filter: PathFilter) => void;
  
  // Set a specific filter to solely be active (hide others)
  isolateFilter: (filter: PathFilter) => void;
  
  // Reset all filters to default (all visible)
  resetFilters: () => void;
  
  // Check if any filters are active
  hasActiveFilters: () => boolean;
  
  // Set a highlight on a specific filter to emphasize it visually
  setHighlight: (filter: PathFilter | null) => void;
}

// Create the context with a default value
const FilterContext = createContext<FilterContextType>({
  filters: DEFAULT_FILTERS,
  highlightedFilter: null,
  toggleFilter: () => {},
  isolateFilter: () => {},
  resetFilters: () => {},
  hasActiveFilters: () => true,
  setHighlight: () => {}
});

// Provider component props
interface FilterProviderProps {
  children: ReactNode;
}

/**
 * Provider component for the filter context
 */
export const FilterProvider: React.FC<FilterProviderProps> = ({ children }) => {
  // State for filter values
  const [filters, setFilters] = useState<Record<PathFilter, boolean>>(DEFAULT_FILTERS);
  
  // State for currently highlighted filter
  const [highlightedFilter, setHighlightedFilter] = useState<PathFilter | null>(null);
  
  // Toggle a single filter
  const toggleFilter = useCallback((filter: PathFilter) => {
    setFilters(prev => ({
      ...prev,
      [filter]: !prev[filter]
    }));
  }, []);
  
  // Isolate a single filter (show only that one)
  const isolateFilter = useCallback((filter: PathFilter) => {
    const newFilters: Record<PathFilter, boolean> = {
      fastest: false,
      alternative: false,
      longestBetween: false,
      longestOverall: false
    };
    
    // Set only the selected filter to true
    newFilters[filter] = true;
    
    // Set the highlight to this filter
    setHighlightedFilter(filter);
    
    setFilters(newFilters);
  }, []);
  
  // Reset all filters to default
  const resetFilters = useCallback(() => {
    // Clear any highlight
    setHighlightedFilter(null);
    setFilters(DEFAULT_FILTERS);
  }, []);
  
  // Set highlighted filter (visual emphasis without filter isolation)
  const setHighlight = useCallback((filter: PathFilter | null) => {
    setHighlightedFilter(filter);
  }, []);
  
  // Check if any filters are active
  const hasActiveFilters = useCallback(() => {
    return Object.values(filters).some(value => value);
  }, [filters]);
  
  // Create context value
  const contextValue: FilterContextType = {
    filters,
    highlightedFilter,
    toggleFilter,
    isolateFilter,
    resetFilters,
    hasActiveFilters,
    setHighlight
  };
  
  return (
    <FilterContext.Provider value={contextValue}>
      {children}
    </FilterContext.Provider>
  );
};

/**
 * Hook for accessing the filter context
 */
export const useFilter = () => useContext(FilterContext);
