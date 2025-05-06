/**
 * IntraAzLatencyVisualizer - Component for visualizing intra-AZ latency data
 * 
 * This component visualizes intra-AZ (availability zone) latency data
 * to assist with HPC planning and infrastructure decisions.
 */
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface ZoneLatency {
  sourceZone: string;
  targetZone: string;
  latency: number;
}

interface RegionData {
  regionName: string;
  displayName: string;
  zones: string[];
  zoneLatencies: ZoneLatency[];
}

interface HpcRecommendation {
  workloadType: string;
  recommendedRegion: string;
  recommendedZones: string[];
  reason: string;
}

interface IntraAzLatencyData {
  timestamp: string;
  regions: RegionData[];
  hpcRecommendations: HpcRecommendation[];
}

interface NetworkData {
  nodes: {
    id: string;
    label: string;
    group: string;
  }[];
  links: {
    source: string;
    target: string;
    value: number;
    label: string;
  }[];
}

interface RegionVizData {
  regionName: string;
  displayName: string;
  stats: {
    min: number;
    max: number;
    avg: number;
  };
  networkData: NetworkData;
}

interface VizData {
  timestamp: string;
  regions: RegionVizData[];
  hpcRecommendations: HpcRecommendation[];
}

interface IntraAzLatencyVisualizerProps {
  /** Path to the intra-AZ latency data file */
  dataPath?: string;
  /** Fixed width for the visualizer */
  width?: number;
  /** Fixed height for the visualizer */
  height?: number;
  /** Selected region to visualize (optional) */
  selectedRegion?: string;
  /** Callback for when a region is selected */
  onRegionSelect?: (region: string) => void;
}

/**
 * Component for visualizing intra-AZ latency data
 */
export const IntraAzLatencyVisualizer: React.FC<IntraAzLatencyVisualizerProps> = ({
  dataPath = '/intra-az-latency-data.json',
  width = 800,
  height = 600,
  selectedRegion,
  onRegionSelect
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VizData | null>(null);
  const [activeRegion, setActiveRegion] = useState<string | null>(selectedRegion || null);
  const [activeTab, setActiveTab] = useState<'viz' | 'hpc'>('viz');
  
  // Refs for d3 visualizations
  const networkRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);
  
  // Load the data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const response = await fetch(dataPath);
        if (!response.ok) {
          throw new Error(`Failed to load data: ${response.statusText}`);
        }
        
        const jsonData = await response.json();
        setData(jsonData.vizData || jsonData);
        
        // Set default active region if not specified
        if (!activeRegion && jsonData.vizData?.regions?.length > 0) {
          setActiveRegion(jsonData.vizData.regions[0].regionName);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading intra-AZ latency data:', err);
        setError(err.message || 'Failed to load data');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [dataPath]);
  
  // Update active region when selectedRegion prop changes
  useEffect(() => {
    if (selectedRegion) {
      setActiveRegion(selectedRegion);
    }
  }, [selectedRegion]);
  
  // Draw the network visualization when data or active region changes
  useEffect(() => {
    if (loading || !data || !activeRegion || !networkRef.current) return;
    
    // Find the active region data
    const regionData = data.regions.find(r => r.regionName === activeRegion);
    if (!regionData) return;
    
    // Clear previous visualization
    d3.select(networkRef.current).selectAll('*').remove();
    
    // Stop previous simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }
    
    const networkData = regionData.networkData;
    
    // Create the SVG
    const svg = d3.select(networkRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');
    
    // Define a color scale for nodes
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    
    // Create a link force simulation
    const simulation = d3.forceSimulation(networkData.nodes)
      .force('link', d3.forceLink(networkData.links)
        .id(d => d.id)
        .distance(d => 100 + (d.value * 20))
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2));
    
    // Create links
    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(networkData.links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.value) * 2);
    
    // Create link labels
    const linkLabels = svg.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(networkData.links)
      .enter()
      .append('text')
      .text(d => d.label)
      .attr('font-size', '10px')
      .attr('text-anchor', 'middle')
      .attr('dy', -5);
    
    // Create nodes
    const node = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(networkData.nodes)
      .enter()
      .append('circle')
      .attr('r', 10)
      .attr('fill', d => color(d.group))
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );
    
    // Create node labels
    const nodeLabels = svg.append('g')
      .attr('class', 'node-labels')
      .selectAll('text')
      .data(networkData.nodes)
      .enter()
      .append('text')
      .text(d => d.label)
      .attr('font-size', '12px')
      .attr('text-anchor', 'middle')
      .attr('dy', -15);
    
    // Add tooltips
    node.append('title')
      .text(d => d.id);
    
    // Update positions on each simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      
      linkLabels
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);
      
      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
      
      nodeLabels
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });
    
    // Store the simulation for cleanup
    simulationRef.current = simulation;
    
    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    // Cleanup function
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [data, activeRegion, loading, width, height]);
  
  // Handle region selection
  const handleRegionSelect = (region: string) => {
    setActiveRegion(region);
    if (onRegionSelect) {
      onRegionSelect(region);
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-2 text-primary-600">Loading intra-AZ latency data...</span>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
        <h3 className="font-bold">Error loading intra-AZ latency data</h3>
        <p>{error}</p>
      </div>
    );
  }
  
  // Render no data state
  if (!data) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-yellow-700">
        <h3 className="font-bold">No intra-AZ latency data available</h3>
        <p>Run the data scraper to collect intra-AZ latency information for HPC planning.</p>
      </div>
    );
  }
  
  // Get active region data
  const activeRegionData = data.regions.find(r => r.regionName === activeRegion);
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="border-b border-gray-200">
        <nav className="flex">
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'viz'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('viz')}
          >
            Visualization
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'hpc'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('hpc')}
          >
            HPC Planning
          </button>
        </nav>
      </div>
      
      <div className="p-4">
        {activeTab === 'viz' ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Intra-AZ Latency Visualization</h3>
              <p className="text-sm text-gray-600 mb-4">
                This visualization shows the latency between availability zones within a region.
                Select a region to view its intra-AZ latency network.
              </p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {data.regions.map(region => (
                  <button
                    key={region.regionName}
                    className={`px-3 py-1 text-sm rounded-md ${
                      activeRegion === region.regionName
                        ? 'bg-primary-100 text-primary-800 border border-primary-300'
                        : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                    }`}
                    onClick={() => handleRegionSelect(region.regionName)}
                  >
                    {region.displayName} ({region.regionName})
                  </button>
                ))}
              </div>
              
              {activeRegionData && (
                <div className="bg-gray-50 rounded-md p-3 mb-4 text-sm">
                  <h4 className="font-medium">{activeRegionData.displayName} Latency Statistics</h4>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div>
                      <span className="text-gray-500">Min Latency:</span>{' '}
                      <span className="font-medium">{activeRegionData.stats.min.toFixed(2)}ms</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Avg Latency:</span>{' '}
                      <span className="font-medium">{activeRegionData.stats.avg.toFixed(2)}ms</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Max Latency:</span>{' '}
                      <span className="font-medium">{activeRegionData.stats.max.toFixed(2)}ms</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-md">
              <svg ref={networkRef} width={width} height={height}></svg>
            </div>
            
            <div className="mt-4 text-sm text-gray-500">
              <p>
                <span className="font-medium">Last updated:</span>{' '}
                {new Date(data.timestamp).toLocaleString()}
              </p>
            </div>
          </>
        ) : (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">HPC Planning Recommendations</h3>
            <p className="text-sm text-gray-600 mb-4">
              Based on intra-AZ latency data, here are recommendations for different HPC workload types.
            </p>
            
            <div className="space-y-6">
              {data.hpcRecommendations?.map((rec, index) => (
                <div key={index} className="border border-gray-200 rounded-md overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h4 className="font-medium">{rec.workloadType}</h4>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center mb-3">
                      <div className="bg-green-100 text-green-800 rounded-md px-2 py-1 text-sm font-medium">
                        Recommended Region: {rec.recommendedRegion}
                      </div>
                    </div>
                    <div className="mb-3">
                      <span className="text-gray-500 text-sm">Recommended Zones:</span>{' '}
                      <span className="font-medium">
                        {rec.recommendedZones.join(', ')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">
                      <span className="text-gray-500">Reason:</span>{' '}
                      {rec.reason}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800">
              <h4 className="font-medium mb-2">How to Use These Recommendations</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <span className="font-medium">Tightly Coupled HPC:</span> Choose regions with lowest intra-AZ latency for workloads that require frequent communication between compute nodes.
                </li>
                <li>
                  <span className="font-medium">ML Training:</span> For ML training jobs, balance latency with GPU availability and storage performance.
                </li>
                <li>
                  <span className="font-medium">Data Analytics:</span> Prioritize regions with consistent performance across zones and good storage options.
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntraAzLatencyVisualizer;
