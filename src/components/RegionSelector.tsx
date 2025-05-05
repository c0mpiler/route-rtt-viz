/**
 * RegionSelector - Sleek, compact region selection component
 * 
 * This component provides a beautiful, minimal interface for selecting 
 * source and target regions with smooth animations and elegant transitions.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { CustomSelect } from './CustomSelect';
import { loadContinentRegions } from '@utils/loadContinentRegions';
import { logger } from '@utils/logger';

interface RegionOption {
  value: string;
  label: string;
  isDisabled?: boolean;
}

interface RegionSelectorProps {
  regions: string[];
  sourceRegion: string | null;
  targetRegion: string | null;
  onSourceChange: (region: string) => void;
  onTargetChange: (region: string) => void;
  onSwap: () => void;
  disabled?: boolean;
}

export const RegionSelector: React.FC<RegionSelectorProps> = ({
  regions,
  sourceRegion,
  targetRegion,
  onSourceChange,
  onTargetChange,
  onSwap,
  disabled = false,
}) => {
  const [isSwapping, setIsSwapping] = useState(false);
  const [continentData, setContinentData] = useState<Record<string, string[]>>({});
  const [continentDataLoaded, setContinentDataLoaded] = useState(false);

  // Load continent data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await loadContinentRegions();
        setContinentData(data);
        setContinentDataLoaded(true);
        logger.info('Continent data loaded for RegionSelector');
      } catch (error) {
        logger.error('Failed to load continent data:', error);
        setContinentData({});
        setContinentDataLoaded(true);
      }
    };
    loadData();
  }, []);

  // Group regions by continent
  const groupRegions = (regions: string[], disabledRegion?: string | null): { label: string; options: RegionOption[] }[] => {
    const result: Record<string, RegionOption[]> = {};
    
    for (const continent of Object.keys(continentData)) {
      result[continent] = [];
    }
    result["Other"] = [];
    
    for (const region of regions) {
      let placed = false;
      for (const [continent, regionList] of Object.entries(continentData)) {
        if (regionList.some(r => region.includes(r) || r.includes(region))) {
          result[continent].push({ 
            value: region, 
            label: region,
            isDisabled: region === disabledRegion
          });
          placed = true;
          break;
        }
      }
      
      if (!placed) {
        result["Other"].push({ 
          value: region, 
          label: region,
          isDisabled: region === disabledRegion 
        });
      }
    }
    
    // Convert to grouped options format
    const groupedOptions: { label: string; options: RegionOption[] }[] = [];
    
    for (const [group, options] of Object.entries(result)) {
      if (options.length > 0) {
        groupedOptions.push({ label: group, options });
      }
    }
    
    return groupedOptions;
  };

  // Group options by continent
  const groupedSourceOptions = useMemo(() => {
    if (!continentDataLoaded) return [];
    return groupRegions(regions, targetRegion);
  }, [regions, targetRegion, continentDataLoaded]);

  const groupedTargetOptions = useMemo(() => {
    if (!continentDataLoaded) return [];
    return groupRegions(regions, sourceRegion);
  }, [regions, sourceRegion, continentDataLoaded]);

  // Handle swap with animation
  const handleSwap = () => {
    if (disabled || !sourceRegion || !targetRegion) return;
    setIsSwapping(true);
    setTimeout(() => {
      onSwap();
      setIsSwapping(false);
    }, 400);
  };

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      {/* Source Region */}
      <div className="w-full md:w-2/5 relative" style={{ 
        transform: isSwapping ? 'translateX(60px)' : 'none', 
        opacity: isSwapping ? 0.3 : 1,
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <label htmlFor="source-region" className="block text-sm font-medium text-slate-700 mb-1.5">
          <span className="flex items-center">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </span>
            Source Location
          </span>
        </label>
        <CustomSelect
          value={sourceRegion}
          onChange={onSourceChange}
          options={groupedSourceOptions}
          placeholder="Select source..."
          isDisabled={disabled}
        />
      </div>

      {/* Swap Button */}
      <div className="flex items-center justify-center md:w-1/5">
        <button
          type="button"
          onClick={handleSwap}
          disabled={disabled || !sourceRegion || !targetRegion || isSwapping}
          className={`relative p-3 rounded-full transition-all duration-300 ${
            isSwapping 
              ? 'animate-spin bg-blue-100' 
              : disabled || !sourceRegion || !targetRegion 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-110 active:scale-95 shadow-md hover:shadow-lg'
          } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          aria-label="Swap regions"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </button>
      </div>

      {/* Target Region */}
      <div className="w-full md:w-2/5 relative" style={{ 
        transform: isSwapping ? 'translateX(-60px)' : 'none', 
        opacity: isSwapping ? 0.3 : 1,
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <label htmlFor="target-region" className="block text-sm font-medium text-slate-700 mb-1.5">
          <span className="flex items-center">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-700 mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </span>
            Target Location
          </span>
        </label>
        <CustomSelect
          value={targetRegion}
          onChange={onTargetChange}
          options={groupedTargetOptions}
          placeholder="Select target..."
          isDisabled={disabled}
        />
      </div>
    </div>
  );
};
