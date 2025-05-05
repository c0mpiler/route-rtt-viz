/**
 * ErrorBoundary - Component for catching and handling React errors
 * 
 * This component catches JavaScript errors anywhere in its child component tree,
 * logs those errors, and displays a fallback UI instead of the component that crashed.
 */
import React from 'react';

interface ErrorBoundaryProps {
  /** Child components to render */
  children: React.ReactNode;
  
  /** Optional custom fallback UI */
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;
  
  /** The error that was caught, if any */
  error?: Error;
}

/**
 * Error boundary component to prevent the entire app from crashing
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  /**
   * Update state when an error occurs
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  /**
   * Log the error to the console
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  /**
   * Render the fallback UI if an error occurred, otherwise render children
   */
  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 text-center bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-red-700 mb-4">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <details className="text-left mb-4 text-sm">
            <summary className="cursor-pointer text-red-600">Error details</summary>
            <pre className="mt-2 p-2 bg-red-100 rounded overflow-auto text-xs">
              {this.state.error?.toString()}
            </pre>
          </details>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
