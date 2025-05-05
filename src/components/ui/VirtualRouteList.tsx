/**
 * VirtualRouteList - High-performance virtual scrolling for route lists
 * 
 * This component efficiently renders large lists of routes by only maintaining
 * the DOM elements for visible items, significantly improving performance
 * with large datasets.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Path } from '@types/network';
import { RouteCard } from '../RouteCard';

interface VirtualRouteListProps {
  paths: Path[];
  maxLatency: number;
  itemHeight?: number;
  visibleItems?: number;
  longestPathIndex?: number;
}

const VirtualRouteList: React.FC<VirtualRouteListProps> = ({
  paths,
  maxLatency,
  itemHeight = 150, // Approximate height of each route card
  visibleItems = 5,
  longestPathIndex,
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Calculate visible items based on scroll position
  const totalHeight = paths.length * itemHeight;
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    paths.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight)
  );
  
  const visiblePaths = paths.slice(startIndex, endIndex + 1);

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Update container height on mount and resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Ensure visible items meet a minimum count
  useEffect(() => {
    if (containerRef.current && containerHeight === 0) {
      const minHeight = visibleItems * itemHeight;
      setContainerHeight(minHeight);
    }
  }, [visibleItems, itemHeight]);

  return (
    <div 
      ref={containerRef}
      className="relative h-full overflow-y-auto overscroll-y-contain"
      onScroll={handleScroll}
      style={{ minHeight: visibleItems * itemHeight }}
    >
      {/* Spacer for total height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Render only visible items */}
        {visiblePaths.map((path, index) => {
          const actualIndex = startIndex + index;
          const isLongest = longestPathIndex !== undefined && 
                          actualIndex === longestPathIndex;
          
          return (
            <div
              key={actualIndex}
              style={{
                position: 'absolute',
                top: actualIndex * itemHeight,
                left: 0,
                right: 0,
                height: itemHeight,
              }}
            >
              <RouteCard
                path={path}
                index={actualIndex}
                isLongest={isLongest}
                maxLatency={maxLatency}
              />
            </div>
          );
        })}
      </div>
      
      {/* Scroll indicators */}
      {paths.length > visibleItems && (
        <div className="absolute top-0 right-0 p-2 pointer-events-none">
          <div className="text-xs text-secondary-500 bg-white/80 px-2 py-1 rounded shadow-sm">
            {startIndex + 1}-{endIndex + 1} of {paths.length}
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced version with additional features
export const VirtualRouteListEnhanced: React.FC<VirtualRouteListProps & {
  onItemSelect?: (path: Path, index: number) => void;
  selectedIndex?: number;
}> = ({
  paths,
  maxLatency,
  itemHeight = 150,
  visibleItems = 5,
  longestPathIndex,
  onItemSelect,
  selectedIndex,
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Scroll to item smoothly
  const scrollToItem = useCallback((index: number) => {
    if (containerRef.current) {
      const scrollPosition = index * itemHeight;
      containerRef.current.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [itemHeight]);

  // Scroll selected item into view when selection changes
  useEffect(() => {
    if (selectedIndex !== undefined) {
      scrollToItem(selectedIndex);
    }
  }, [selectedIndex, scrollToItem]);

  const totalHeight = paths.length * itemHeight;
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    paths.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight)
  );
  
  const visiblePaths = paths.slice(startIndex, endIndex + 1);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative h-full overflow-y-auto overscroll-y-contain scrollbar-thin scrollbar-thumb-secondary-300 scrollbar-track-secondary-100"
      onScroll={handleScroll}
      style={{ minHeight: visibleItems * itemHeight }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visiblePaths.map((path, index) => {
          const actualIndex = startIndex + index;
          const isLongest = longestPathIndex !== undefined && 
                          actualIndex === longestPathIndex;
          const isSelected = selectedIndex === actualIndex;
          
          return (
            <div
              key={actualIndex}
              ref={(el) => {
                if (el) {
                  itemRefs.current.set(actualIndex, el);
                } else {
                  itemRefs.current.delete(actualIndex);
                }
              }}
              style={{
                position: 'absolute',
                top: actualIndex * itemHeight,
                left: 0,
                right: 0,
                height: itemHeight,
              }}
              className={isSelected ? 'ring-2 ring-primary-500' : ''}
              onClick={() => onItemSelect?.(path, actualIndex)}
            >
              <RouteCard
                path={path}
                index={actualIndex}
                isLongest={isLongest}
                maxLatency={maxLatency}
              />
            </div>
          );
        })}
      </div>
      
      {/* Performance indicator */}
      {__DEV__ && (
        <div className="fixed bottom-4 right-4 text-xs text-secondary-500 bg-secondary-900/80 text-white px-2 py-1 rounded shadow-sm pointer-events-none">
          <div>Rendered: {visiblePaths.length}/{paths.length}</div>
          <div>Start: {startIndex}, End: {endIndex}</div>
        </div>
      )}
    </div>
  );
};

export default VirtualRouteList;
