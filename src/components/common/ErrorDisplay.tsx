/**
 * ErrorDisplay - Component for displaying error messages
 * 
 * This component provides a consistent way to display error messages
 * throughout the application.
 */
import React from 'react';
import { NetworkError } from '../../types/network';

interface ErrorDisplayProps {
  /** Error message or object */
  error: string | NetworkError | null;
  
  /** Optional handler for retry functionality */
  onRetry?: () => void;
  
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Error display component
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  className = ''
}) => {
  if (!error) return null;
  
  // Extract error message
  const errorMessage = typeof error === 'string' 
    ? error 
    : error.message;
  
  // Extract error code if available
  const errorCode = typeof error === 'object' && error.code 
    ? error.code 
    : null;

  return (
    <div className={`bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-500"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <p className="font-bold">Error {errorCode ? `(${errorCode})` : ''}</p>
          <p>{errorMessage}</p>
          
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 px-3 py-1 bg-red-700 text-white text-sm rounded hover:bg-red-800 transition-colors duration-150"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
