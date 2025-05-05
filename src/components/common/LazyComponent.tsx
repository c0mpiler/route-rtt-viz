/**
 * LazyComponent - Higher-order component for lazy loading
 * 
 * This component provides a standardized way to lazy-load components
 * with a consistent loading state and error handling.
 */
import React, { Suspense } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingIndicator } from '../LoadingIndicator';

interface LazyComponentProps {
  /** Component to render */
  component: React.ReactNode;
  
  /** Loading message */
  loadingMessage?: string;
  
  /** Minimum height for the loading container */
  minHeight?: string;
}

/**
 * Wrapper for lazy-loaded components with Suspense and ErrorBoundary
 */
export const LazyComponent: React.FC<LazyComponentProps> = ({
  component,
  loadingMessage = 'Loading...',
  minHeight = '500px'
}) => {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div 
            className="flex items-center justify-center" 
            style={{ minHeight }}
          >
            <LoadingIndicator text={loadingMessage} />
          </div>
        }
      >
        {component}
      </Suspense>
    </ErrorBoundary>
  );
};
