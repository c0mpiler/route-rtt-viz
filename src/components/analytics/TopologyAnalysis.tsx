/**
 * TopologyAnalysis - Network topology visualization and analysis
 */
import React from 'react';
import { TopologyStats } from './AdvancedAnalytics';
import { NetworkGraph } from '../../utils/network/NetworkGraph';
import { Path } from '../../types/network';
import { motion } from 'framer-motion';
import * as d3 from 'd3';

interface TopologyAnalysisProps {
  stats: TopologyStats;
  graph: NetworkGraph;
  paths: Path[];
}

export const TopologyAnalysis: React.FC<TopologyAnalysisProps> = ({ stats, graph, paths }) => {
  return (
    <div className="space-y-6">
      {/* Topology Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <TopologyMetricCard
          title="Network Nodes"
          value={stats.nodeCount.toString()}
          icon="nodes"
          delay={0.1}
        />
        <TopologyMetricCard
          title="Network Edges"
          value={stats.edgeCount.toString()}
          icon="edges"
          delay={0.2}
        />
        <TopologyMetricCard
          title="Network Density"
          value={stats.density.toFixed(3)}
          icon="density"
          delay={0.3}
        />
        <TopologyMetricCard
          title="Network Diameter"
          value={stats.diameter.toString()}
          icon="diameter"
          delay={0.4}
        />
      </div>

      {/* Degree Distribution */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="bg-white border border-secondary-200 rounded-lg p-6"
      >
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Degree Distribution</h3>
        <DegreeDistributionChart graph={graph} />
      </motion.div>

      {/* Critical Nodes */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        className="bg-white border border-secondary-200 rounded-lg p-6"
      >
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Critical Nodes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.criticalNodes.map((node, index) => (
            <CriticalNodeCard key={node} node={node} index={index} graph={graph} />
          ))}
        </div>
      </motion.div>

      {/* Network Structure Analysis */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.7 }}
        className="bg-white border border-secondary-200 rounded-lg p-6"
      >
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Network Structure Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-secondary-700 mb-2">Clustering Coefficient</h4>
            <p className="text-2xl font-bold text-secondary-900">{stats.clusteringCoefficient.toFixed(3)}</p>
            <p className="text-sm text-secondary-600 mt-1">
              Measures how well nodes cluster together
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-secondary-700 mb-2">Average Node Degree</h4>
            <p className="text-2xl font-bold text-secondary-900">{stats.averageDegree.toFixed(1)}</p>
            <p className="text-sm text-secondary-600 mt-1">
              Average connections per node
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const TopologyMetricCard: React.FC<{
  title: string;
  value: string;
  icon: 'nodes' | 'edges' | 'density' | 'diameter';
  delay: number;
}> = ({ title, value, icon, delay }) => {
  const getIcon = () => {
    switch (icon) {
      case 'nodes':
        return (
          <svg className="h-8 w-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM4 7a3 3 0 116 0v1M4 17a3 3 0 116 0v-1m8-9a3 3 0 10-6 0v1m0 0v3m6 3a3 3 0 01-6 0v-3" />
          </svg>
        );
      case 'edges':
        return (
          <svg className="h-8 w-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        );
      case 'density':
        return (
          <svg className="h-8 w-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        );
      case 'diameter':
        return (
          <svg className="h-8 w-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
        );
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="bg-secondary-50 p-6 rounded-lg"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-secondary-600">{title}</h3>
          <p className="text-2xl font-bold text-secondary-900 mt-1">{value}</p>
        </div>
        <div>
          {getIcon()}
        </div>
      </div>
    </motion.div>
  );
};

const DegreeDistributionChart: React.FC<{ graph: NetworkGraph }> = ({ graph }) => {
  React.useEffect(() => {
    try {
      const nodes = graph.getRegions();
      const degrees = nodes.map(node => Object.keys(graph.getConnections(node)).length);
      
      // Create histogram data
      const maxDegree = Math.max(...degrees);
      const bins = d3.range(0, maxDegree + 2).map(d => ({
        degree: d,
        count: degrees.filter(deg => deg === d).length
      }));

      // Remove any existing chart
      d3.select("#degree-chart").selectAll("*").remove();

      // Set dimensions
      const margin = { top: 20, right: 20, bottom: 30, left: 40 };
      const width = 600 - margin.left - margin.right;
      const height = 300 - margin.top - margin.bottom;

      // Create SVG
      const svg = d3.select("#degree-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Create scales
      const x = d3.scaleBand()
        .domain(bins.map(d => d.degree.toString()))
        .range([0, width])
        .padding(0.1);

      const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.count) || 1])
        .range([height, 0]);

      // Create bars
      svg.selectAll(".bar")
        .data(bins)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => {
          const xPos = x(d.degree.toString());
          return xPos || 0;
        })
        .attr("y", d => {
          const yPos = y(d.count);
          return isNaN(yPos) ? height : yPos;
        })
        .attr("width", x.bandwidth())
        .attr("height", d => {
          const barHeight = height - y(d.count);
          return isNaN(barHeight) ? 0 : barHeight;
        })
        .attr("fill", "#4F46E5")
        .attr("opacity", 0.7)
        .on("mouseover", function(event, d) {
          d3.select(this).attr("opacity", 1);
        })
        .on("mouseout", function(event, d) {
          d3.select(this).attr("opacity", 0.7);
        });

      // Add axes with error handling
      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "middle");

      svg.append("g")
        .call(d3.axisLeft(y).ticks(5));

      // Add labels
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom)
        .attr("text-anchor", "middle")
        .text("Node Degree");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .attr("text-anchor", "middle")
        .text("Number of Nodes");
    } catch (error) {
      console.error('Error rendering degree distribution chart:', error);
      d3.select("#degree-chart").html('<div class="text-red-600">Error rendering chart</div>');
    }
  }, [graph]);

  return <div id="degree-chart" className="w-full h-64" />;
};

const CriticalNodeCard: React.FC<{ node: string; index: number; graph: NetworkGraph }> = ({ node, index, graph }) => {
  const connections = Object.keys(graph.getConnections(node)).length;
  
  // Since getAllShortestPaths doesn't exist, we can't show path involvement
  // We could calculate it, but for now, let's remove it to fix the error
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="bg-secondary-50 p-4 rounded-lg border border-secondary-200"
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-secondary-900">{node}</h4>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
          Rank #{index + 1}
        </span>
      </div>
      <div className="space-y-1">
        <p className="text-sm text-secondary-600">Connections: {connections}</p>
      </div>
    </motion.div>
  );
};
