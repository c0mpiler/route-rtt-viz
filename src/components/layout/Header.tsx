/**
 * Header - Main application header component
 *
 * This component renders the application header with title, description,
 * and advanced tools button.
 */
import React from "react";

interface HeaderProps {
  /** Handler for toggling debugging tools */
  onToggleDebuggingTools: () => void;
}

/**
 * Application header component
 */
export const Header: React.FC<HeaderProps> = ({ onToggleDebuggingTools }) => {
  return (
    <header className="bg-white shadow-md border-b border-secondary-200">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary-800 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 mr-2 text-primary-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Route Radar
            </h1>
            <p className="text-secondary-600 mt-1 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1 text-primary-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Visualize network latency and find optimal paths between any
              regions
            </p>
          </div>

          <div className="mt-4 md:mt-0">
            {/* Only show advanced tools button in development mode */}
            {process.env.NODE_ENV === "development" && (
              <span className="inline-flex rounded-md shadow-sm">
                <button
                  onClick={onToggleDebuggingTools}
                  title="Advanced Tools"
                  className="p-2 border border-secondary-300 rounded-full text-secondary-700 bg-white hover:text-primary-600 hover:border-primary-300 focus:outline-none focus:border-primary-300 focus:shadow-outline-primary transition duration-150 ease-in-out"
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
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
