/**
 * LatencyTest - Test component for latency visualizers
 * 
 * This component is used to test the latency visualization components
 * in development mode.
 */
import React from 'react';
import { IntraAzLatencyVisualizer } from '@components/viz/IntraAzLatencyVisualizer';

interface LatencyTestProps {
  /** Show or hide the component */
  visible?: boolean;
}

/**
 * Latency Test Component
 */
export const LatencyTest: React.FC<LatencyTestProps> = ({
  visible = true
}) => {
  if (!visible) return null;
  
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">IBM Cloud Latency Visualization Test</h2>
      
      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-800">
          This is a test component for the IBM Cloud latency visualizations.
          It is only visible in development mode.
        </p>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Intra-AZ Latency Visualization</h3>
        <IntraAzLatencyVisualizer />
      </div>
    </div>
  );
};

export default LatencyTest;
