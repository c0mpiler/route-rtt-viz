/**
 * RegionSelector - Sleek, compact region selection component
 * 
 * This component provides a beautiful, minimal interface for selecting 
 * source and target regions with smooth animations and elegant transitions.
 */
import React, { useState, useMemo, useEffect } from 'react';
import Select from 'react-select';
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
  const groupRegions = (regions: string[]): Record<string, RegionOption[]> => {
    const result: Record<string, RegionOption[]> = {};
    
    for (const continent of Object.keys(continentData)) {
      result[continent] = [];
    }
    result["Other"] = [];
    
    for (const region of regions) {
      let placed = false;
      for (const [continent, regionList] of Object.entries(continentData)) {
        if (regionList.some(r => region.includes(r) || r.includes(region))) {
          result[continent].push({ value: region, label: region });
          placed = true;
          break;
        }
      }
      
      if (!placed) {
        result["Other"].push({ value: region, label: region });
      }
    }
    
    for (const continent of Object.keys(result)) {
      if (result[continent].length === 0) {
        delete result[continent];
      }
    }
    
    return result;
  };

  // Filter options
  const sourceOptions: RegionOption[] = useMemo(
    () => regions.map((region) => ({
      value: region,
      label: region,
      isDisabled: region === targetRegion,
    })),
    [regions, targetRegion]
  );

  const targetOptions: RegionOption[] = useMemo(
    () => regions.map((region) => ({
      value: region,
      label: region,
      isDisabled: region === sourceRegion,
    })),
    [regions, sourceRegion]
  );

  // Group options by continent
  const groupedSourceOptions = useMemo(() => {
    if (!continentDataLoaded) return [];
    const enabledOptions = sourceOptions.filter(opt => !opt.isDisabled);
    const grouped = groupRegions(enabledOptions.map(opt => opt.value));
    return Object.entries(grouped).map(([group, options]) => ({
      label: group,
      options: options
    }));
  }, [sourceOptions, continentDataLoaded]);

  const groupedTargetOptions = useMemo(() => {
    if (!continentDataLoaded) return [];
    const enabledOptions = targetOptions.filter(opt => !opt.isDisabled);
    const grouped = groupRegions(enabledOptions.map(opt => opt.value));
    return Object.entries(grouped).map(([group, options]) => ({
      label: group,
      options: options
    }));
  }, [targetOptions, continentDataLoaded]);

  // Find current values
  const sourceOption = useMemo(
    () => sourceOptions.find((option) => option.value === sourceRegion) || null,
    [sourceOptions, sourceRegion]
  );

  const targetOption = useMemo(
    () => targetOptions.find((option) => option.value === targetRegion) || null,
    [targetOptions, targetRegion]
  );

  // Handle swap with animation
  const handleSwap = () => {
    if (disabled || !sourceRegion || !targetRegion) return;
    setIsSwapping(true);
    setTimeout(() => {
      onSwap();
      setIsSwapping(false);
    }, 400);
  };

  // Elegant custom styles for react-select
  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      borderColor: state.isFocused ? '#3b82f6' : '#e2e8f0',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.1)' : 'none',
      background: state.isDisabled ? '#f8fafc' : 'white',
      borderRadius: '0.5rem',
      transition: 'all 0.2s ease',
      '&:hover': {
        borderColor: state.isFocused ? '#3b82f6' : '#94a3b8',
      },
      minHeight: '44px',
      padding: '0 0.5rem',
    }),
    groupHeading: (provided: any) => ({
      ...provided,
      color: '#475569',
      fontWeight: 600,
      fontSize: '0.75rem',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      paddingTop: '0.75rem',
      paddingBottom: '0.5rem',
    }),
    option: (provided: any, state: { isSelected: boolean; isFocused: boolean; isDisabled: boolean }) => ({
      ...provided,
      backgroundColor: state.isDisabled 
        ? 'transparent' 
        : state.isSelected
          ? '#3b82f6'
          : state.isFocused
            ? '#eff6ff'
            : undefined,
      color: state.isDisabled 
        ? '#94a3b8' 
        : state.isSelected 
          ? 'white' 
          : '#0f172a',
      cursor: state.isDisabled ? 'not-allowed' : 'pointer',
      padding: '10px 15px',
      fontSize: '0.95rem',
      fontWeight: state.isSelected ? '500' : '400',
      borderRadius: '0.25rem',
      margin: '2px 0',
      transition: 'all 0.15s ease',
      '&:active': {
        backgroundColor: state.isSelected ? '#2563eb' : '#dbeafe',
      },
    }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
    menu: (provided: any) => ({
      ...provided,
      borderRadius: '0.5rem',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      padding: '0.5rem',
      border: '1px solid #e2e8f0',
    }),
    container: (provided: any) => ({
      ...provided,
      width: '100%',
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: '#94a3b8',
      fontWeight: '400',
    }),
    singleValue: (provided: any) => ({
      ...provided,
      fontWeight: 500,
      color: '#1e293b',
    }),
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
        <Select
          id="source-region"
          instanceId="source-region-select"
          isDisabled={disabled}
          value={sourceOption}
          onChange={(option) => option && onSourceChange(option.value)}
          options={groupedSourceOptions}
          styles={customStyles}
          placeholder="Select source..."
          className="react-select-container"
          classNamePrefix="react-select"
          menuPortalTarget={document.body}
          menuPosition="fixed"
          formatGroupLabel={(data) => (
            <div className="flex items-center justify-between">
              <span>{data.label}</span>
              <span className="text-xs text-slate-500">{data.options.length}</span>
            </div>
          )}
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
        <Select
          id="target-region"
          instanceId="target-region-select"
          isDisabled={disabled}
          value={targetOption}
          onChange={(option) => option && onTargetChange(option.value)}
          options={groupedTargetOptions}
          styles={customStyles}
          placeholder="Select target..."
          className="react-select-container"
          classNamePrefix="react-select"
          menuPortalTarget={document.body}
          menuPosition="fixed"
          formatGroupLabel={(data) => (
            <div className="flex items-center justify-between">
              <span>{data.label}</span>
              <span className="text-xs text-slate-500">{data.options.length}</span>
            </div>
          )}
        />
      </div>
    </div>
  );
};
