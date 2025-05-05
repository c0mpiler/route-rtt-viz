/**
 * UnifiedHeader - An elegant integrated header with region selection
 * 
 * This component provides a streamlined header that combines region selection
 * with other navigation controls in a space-efficient design.
 */
import React, { useState, useEffect } from 'react';
import { RegionSelector } from '@components/RegionSelector';
import { LoadingIndicator } from '@components/LoadingIndicator';

interface UnifiedHeaderProps {
  regions: string[];
  sourceRegion: string | null;
  targetRegion: string | null;
  onSourceChange: (region: string) => void;
  onTargetChange: (region: string) => void;
  onSwap: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  onToggleDebuggingTools?: () => void;
  showDebugTools?: boolean;
}

export const UnifiedHeader: React.FC<UnifiedHeaderProps> = ({
  regions,
  sourceRegion,
  targetRegion,
  onSourceChange,
  onTargetChange,
  onSwap,
  disabled = false,
  isLoading = false,
  onToggleDebuggingTools,
  showDebugTools = false,
}) => {
  const [showRegionSelector, setShowRegionSelector] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsCompact(window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      {/* Main navigation bar */}
      <div className="h-16 px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2">
            <svg
              className="h-8 w-8 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-lg font-semibold text-gray-900">Route Radar</span>
          </div>

          {/* Region Selection - Compact Mode */}
          {!isCompact && sourceRegion && targetRegion && (
            <div className="hidden lg:flex items-center gap-2 ml-8">
              <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 rounded-md text-sm">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </span>
                <span className="font-medium text-gray-700">{sourceRegion}</span>
              </div>
              <button
                onClick={() => setShowRegionSelector(true)}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                title="Change regions"
              >
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 rounded-md text-sm">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </span>
                <span className="font-medium text-gray-700">{targetRegion}</span>
              </div>
            </div>
          )}

          {/* "Set Path" button when no regions selected */}
          {!sourceRegion || !targetRegion ? (
            <button
              onClick={() => setShowRegionSelector(true)}
              className="ml-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
            >
              Set Path
            </button>
          ) : null}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-4">
          {isLoading && <LoadingIndicator variant="compact" />}
          
          {showDebugTools !== undefined && (
            <button
              onClick={onToggleDebuggingTools}
              className={`p-2 rounded-lg ${
                showDebugTools 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Region Selection Modal */}
      {showRegionSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Select Regions</h2>
              <button
                onClick={() => setShowRegionSelector(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <RegionSelector
              regions={regions}
              sourceRegion={sourceRegion}
              targetRegion={targetRegion}
              onSourceChange={onSourceChange}
              onTargetChange={onTargetRegion}
              onSwap={onSwap}
              disabled={disabled}
            />
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowRegionSelector(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowRegionSelector(false)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
