/**
 * HeaderWithRegions - Unified header combining app branding with region selection
 *
 * This component provides an elegant, space-efficient header that includes
 * both the application branding and region selection controls.
 */
import React, { useState } from "react";
import { RegionSelector } from "@components/RegionSelector";
import { LoadingIndicator } from "@components/LoadingIndicator";
import { FileUploader } from "@components/data-management";
import type { NetworkData } from "@types/network";

interface HeaderWithRegionsProps {
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
  initialLoadComplete?: boolean;
  onNetworkDataUpload?: (data: NetworkData) => void;
}

export const HeaderWithRegions: React.FC<HeaderWithRegionsProps> = ({
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
  initialLoadComplete = false,
  onNetworkDataUpload,
}) => {
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleDataUpload = async (data: NetworkData) => {
    if (onNetworkDataUpload) {
      try {
        await onNetworkDataUpload(data);
        setShowUploadModal(false);
        setUploadError(null);
      } catch (error) {
        setUploadError(
          error instanceof Error ? error.message : "Failed to upload data",
        );
      }
    }
  };

  const handleUploadError = (error: Error) => {
    setUploadError(error.message);
  };

  return (
    <header className="bg-white shadow-md border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          {/* App Branding */}
          <div className="flex items-center justify-between mb-4 lg:mb-0">
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-primary-600 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
                  Route Radar
                </h1>
                <p className="text-sm text-gray-600 hidden sm:block">
                  Visualize network latency and find optimal paths
                </p>
              </div>
            </div>

            {/* Mobile Debug Tools */}
            {process.env.NODE_ENV === "development" && (
              <div className="lg:hidden">
                <button
                  onClick={onToggleDebuggingTools}
                  className={`p-2 rounded-lg ${
                    showDebugTools
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Region Selection Section */}
          <div className="flex items-center gap-4">
            {!initialLoadComplete ? (
              <div className="flex items-center">
                <LoadingIndicator size="small" text="Loading..." type="pulse" />
              </div>
            ) : sourceRegion && targetRegion ? (
              <>
                {/* Compact Region Display */}
                <div className="hidden lg:flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 10l7-7m0 0l7 7m-7-7v18"
                        />
                      </svg>
                    </span>
                    <span className="font-medium text-emerald-800">
                      {sourceRegion}
                    </span>
                  </div>
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 rounded-lg">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-700">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                      </svg>
                    </span>
                    <span className="font-medium text-rose-800">
                      {targetRegion}
                    </span>
                  </div>
                </div>

                {/* Change regions button */}
                <button
                  onClick={() => setShowRegionModal(true)}
                  className="px-4 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Change Regions
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowRegionModal(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                Set Path
              </button>
            )}

            {/* Loading Indicator */}
            {isLoading && <LoadingIndicator variant="compact" />}

            {/* Upload Data Button */}
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span className="hidden sm:inline">Import Data</span>
            </button>

            {/* Desktop Debug Tools */}
            {process.env.NODE_ENV === "development" && (
              <div className="hidden lg:block">
                <button
                  onClick={onToggleDebuggingTools}
                  className={`p-2 rounded-lg ${
                    showDebugTools
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Region Selection Modal */}
      {showRegionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Select Network Regions
              </h2>
              <button
                onClick={() => setShowRegionModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg
                  className="h-5 w-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <RegionSelector
              regions={regions}
              sourceRegion={sourceRegion}
              targetRegion={targetRegion}
              onSourceChange={onSourceChange}
              onTargetChange={onTargetChange}
              onSwap={onSwap}
              disabled={disabled}
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowRegionModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowRegionModal(false)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Upload Data Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Import Network Data
              </h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg
                  className="h-5 w-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <FileUploader
              onDataLoaded={handleDataUpload}
              onError={handleUploadError}
            />

            {uploadError && (
              <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
                <p className="font-medium">Error processing file</p>
                <p className="text-sm">{uploadError}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
