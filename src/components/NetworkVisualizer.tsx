import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { NetworkGraph } from '@utils/network/NetworkGraph';
import { Path } from '@types/network';
import { categorizeLatency, LatencyCategory } from '@utils/formatters';
import { isValidCoordinate, generateSafePath } from '@utils/visualization';
import { getCoordinatesFor, getAllCoordinates, hasCoordinatesData } from '@utils/coordsHelper';
import { useFilter } from '@context/FilterContext';

interface NetworkVisualizerProps {
  graph: NetworkGraph | null;
  paths: Path[];
  longestPath: Path | null;
  longestPathBetween: Path | null; // Add longestPathBetween prop
  sourceRegion: string | null;
  targetRegion: string | null;
}

// Type for D3 node
interface Node extends d3.SimulationNodeDatum {
  id: string;
  group: number;
  highlighted: boolean;
  // Geographic coordinates
  longitude: number;
  latitude: number;
}

// Type for D3 link
interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  value: number;
  highlighted: boolean;
}

// Beautiful color palette with improved visibility
const colors = {
  source: '#059669', // Emerald green
  target: '#dc2626', // Ruby red
  fastest: '#0891b2', // Cyan
  alternative: '#4f46e5', // Indigo
  longestBetween: '#f59e0b', // Amber
  longestOverall: '#be123c', // Rose
  inactive: '#94a3b8', // Slate gray
  fastestDark: '#075985', // Dark cyan
  alternativeDark: '#3730a3', // Dark indigo
  longestBetweenDark: '#d97706', // Dark amber
  longestOverallDark: '#9f1239', // Dark rose
};

export const NetworkVisualizer: React.FC<NetworkVisualizerProps> = ({
  graph,
  paths,
  longestPath,
  longestPathBetween, // Add the new prop
  sourceRegion,
  targetRegion,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isCoordinatesReady, setIsCoordinatesReady] = useState(false);
  
  // Get filter state from context
  const { filters, highlightedFilter } = useFilter();
  
  // Check if coordinates are ready
  useEffect(() => {
    const checkCoordinates = () => {
      if (hasCoordinatesData()) {
        setIsCoordinatesReady(true);
        console.log('[NetworkVisualizer] Coordinates data is now ready');
      } else {
        setIsCoordinatesReady(false);
      }
    };
    
    checkCoordinates();
    
    // Set up an interval to check periodically if coordinates become available
    const interval = setInterval(checkCoordinates, 100);
    
    return () => clearInterval(interval);
  }, []);

  // Function to build graph data for D3 with geographic positions
  const buildGraphData = () => {
    if (!graph) return { nodes: [], links: [] };
    
    // Check if coordinates data is available
    if (!hasCoordinatesData()) {
      console.warn('[NetworkVisualizer] Coordinates data not available yet');
      return { nodes: [], links: [] };
    }

    const networkData = graph.toNetworkData();
    const regions = graph.getRegions();

    // Create nodes with geographic positioning
    const nodes: Node[] = regions.map(region => {
      // Get geographic coordinates for this region
      const [longitude, latitude] = getCoordinatesFor(region);
      
      // Debug invalid coordinates
      if (!isValidCoordinate(longitude, latitude)) {
        console.error(`Invalid coordinates for region ${region}: [${longitude}, ${latitude}]`);
        console.log('Available coordinates data:', hasCoordinatesData());
        console.log('Checking if region exists in data:', region);
      }
      
      return {
        id: region,
        group: getNodeGroup(region),
        highlighted: isNodeHighlighted(region),
        // Store geographic coordinates for reference
        longitude: longitude,
        latitude: latitude
      };
    });

    // Create links (edges)
    const links: Link[] = [];
    
    for (const [source, targets] of Object.entries(networkData)) {
      for (const [target, value] of Object.entries(targets)) {
        // Only add each link once (avoid duplicates)
        if (source < target) {
          links.push({
            source,
            target,
            value,
            highlighted: isLinkHighlighted(source, target),
          });
        }
      }
    }

    return { nodes, links };
  };

  // Determine the group for a node (for coloring)
  const getNodeGroup = (region: string): number => {
    if (region === sourceRegion) return 1;
    if (region === targetRegion) return 2;
    
    // Check if the region is in any of the highlighted paths
    const validPaths = Array.isArray(paths) ? paths.filter(p => p && p.route) : [];
    
    // Prioritize path types for proper coloring
    if (highlightedFilter === 'longestOverall' && longestPath && longestPath.route && longestPath.route.includes(region)) {
      return 3; // Overall longest path - highest visibility
    }
    
    if (highlightedFilter === 'longestBetween' && longestPathBetween && longestPathBetween.route && 
        longestPathBetween.route.includes(region)) {
      return 6; // Longest path between selected regions
    }
    
    if (highlightedFilter === 'fastest' && validPaths.length > 0 && validPaths[0].route && 
        validPaths[0].route.includes(region)) {
      return 4; // Fastest path
    }
    
    if (highlightedFilter === 'alternative' && validPaths.length > 1) {
      for (let i = 1; i < validPaths.length; i++) {
        if (validPaths[i] && validPaths[i].route && validPaths[i].route.includes(region)) {
          return 5; // Alternative path
        }
      }
    }
    
    // Non-highlighted context check
    if (!highlightedFilter) {
      const allPaths = [...validPaths];
      
      if (longestPath && longestPath.route) {
        allPaths.push(longestPath);
      }
      
      if (longestPathBetween && longestPathBetween.route) {
        allPaths.push(longestPathBetween);
      }
      
      // Determine path membership for coloring
      if (filters.longestOverall && longestPath && longestPath.route && longestPath.route.includes(region)) {
        return 3; // Overall longest path
      }
      
      if (filters.longestBetween && longestPathBetween && longestPathBetween.route && 
          longestPathBetween.route.includes(region)) {
        return 6; // Longest between selected
      }
      
      if (filters.fastest && validPaths.length > 0 && validPaths[0] && validPaths[0].route && 
          validPaths[0].route.includes(region)) {
        return 4; // Fastest path
      }
      
      if (filters.alternative && validPaths.length > 1) {
        for (let i = 1; i < validPaths.length; i++) {
          if (validPaths[i] && validPaths[i].route && validPaths[i].route.includes(region)) {
            return 5; // Alternative path
          }
        }
      }
    }
    
    return 0; // Default group for non-highlighted nodes
  };

  // Check if a node should be highlighted
  const isNodeHighlighted = (region: string): boolean => {
    if (region === sourceRegion || region === targetRegion) return true;
    
    // If we have an active highlight, only show nodes in that specific path
    if (highlightedFilter) {
      // Handle each highlight filter type
      if (highlightedFilter === 'fastest' && paths && paths.length > 0 && paths[0] && paths[0].route) {
        return paths[0].route.includes(region);
      }
      
      if (highlightedFilter === 'alternative' && paths && paths.length > 1) {
        // Check if region is in any alternative path (all paths except the first one)
        for (let i = 1; i < paths.length; i++) {
          if (paths[i] && paths[i].route && paths[i].route.includes(region)) {
            return true;
          }
        }
        return false;
      }
      
      if (highlightedFilter === 'longestBetween' && longestPathBetween && longestPathBetween.route) {
        return longestPathBetween.route.includes(region);
      }
      
      if (highlightedFilter === 'longestOverall' && longestPath && longestPath.route) {
        return longestPath.route.includes(region);
      }
      
      return false;
    }
    
    // Use filter settings if no specific highlight is active
    const showFastest = filters.fastest;
    const showAlternative = filters.alternative;
    const showLongestBetween = filters.longestBetween;
    const showLongestOverall = filters.longestOverall;
    
    // If all filters are off, only highlight source and target
    if (!showFastest && !showAlternative && !showLongestBetween && !showLongestOverall) {
      return region === sourceRegion || region === targetRegion;
    }
    
    // Check if the region is in any of the highlighted paths based on filters
    if (showFastest && paths && paths.length > 0 && paths[0] && paths[0].route && paths[0].route.includes(region)) {
      return true; // Fastest path
    }
    
    if (showAlternative && paths && paths.length > 1) {
      for (let i = 1; i < paths.length; i++) {
        if (paths[i] && paths[i].route && paths[i].route.includes(region)) {
          return true; // Alternative paths
        }
      }
    }
    
    if (showLongestBetween && longestPathBetween && longestPathBetween.route && 
        longestPathBetween.route.includes(region)) {
      return true; // Longest path between selected regions
    }
    
    if (showLongestOverall && longestPath && longestPath.route && 
        longestPath.route.includes(region)) {
      return true; // Overall longest path
    }
    
    return false;
  };

  // Check if a link should be highlighted
  const isLinkHighlighted = (source: string, target: string): boolean => {
    // Helper function to check if a link is in a specific path
    const isLinkInPathRoute = (path: Path): boolean => {
      if (!path || !path.route || !Array.isArray(path.route)) return false;
      
      const route = path.route;
      for (let i = 0; i < route.length - 1; i++) {
        const pathSource = route[i];
        const pathTarget = route[i + 1];
        
        if (
          (pathSource === source && pathTarget === target) ||
          (pathSource === target && pathTarget === source)
        ) {
          return true;
        }
      }
      return false;
    };
    
    // If we have an active highlight, only show links in that specific path
    if (highlightedFilter) {
      // Handle each highlight filter type
      if (highlightedFilter === 'fastest' && paths && paths.length > 0 && paths[0]) {
        return isLinkInPathRoute(paths[0]);
      }
      
      if (highlightedFilter === 'alternative' && paths && paths.length > 1) {
        for (let i = 1; i < paths.length; i++) {
          if (paths[i] && isLinkInPathRoute(paths[i])) {
            return true;
          }
        }
        return false;
      }
      
      if (highlightedFilter === 'longestBetween' && longestPathBetween) {
        return isLinkInPathRoute(longestPathBetween);
      }
      
      if (highlightedFilter === 'longestOverall' && longestPath) {
        return isLinkInPathRoute(longestPath);
      }
      
      return false;
    }
    
    // Use filter settings if no specific highlight is active
    const showFastest = filters.fastest;
    const showAlternative = filters.alternative;
    const showLongestBetween = filters.longestBetween;
    const showLongestOverall = filters.longestOverall;
    
    // If all filters are off, don't highlight any links
    if (!showFastest && !showAlternative && !showLongestBetween && !showLongestOverall) {
      return false;
    }
    
    // Check each path type according to filters
    if (showFastest && paths && paths.length > 0 && paths[0]) {
      if (isLinkInPathRoute(paths[0])) return true; // Fastest path
    }
    
    if (showAlternative && paths && paths.length > 1) {
      for (let i = 1; i < paths.length; i++) {
        if (paths[i] && isLinkInPathRoute(paths[i])) {
          return true; // Alternative paths
        }
      }
    }
    
    if (showLongestBetween && longestPathBetween) {
      if (isLinkInPathRoute(longestPathBetween)) {
        return true; // Longest path between selected regions
      }
    }
    
    if (showLongestOverall && longestPath) {
      if (isLinkInPathRoute(longestPath)) {
        return true; // Overall longest path
      }
    }
    
    return false;
  };

  // Function to get the path-specific color for a link
  const getLinkColor = (link: Link): string => {
    if (!link.highlighted) return '#aaa';
    
    // If we have an active highlight, only show links in that specific path
    if (highlightedFilter) {
      if (highlightedFilter === 'fastest' && paths && paths.length > 0 && 
          isLinkInPath(link, paths[0])) {
        return colors.fastestDark; // Dark cyan for highlighted fastest path
      }
      
      if (highlightedFilter === 'alternative' && paths && paths.length > 1) {
        for (let i = 1; i < paths.length; i++) {
          if (paths[i] && isLinkInPath(link, paths[i])) {
            return colors.alternativeDark; // Dark indigo for highlighted alternative path
          }
        }
      }
      
      if (highlightedFilter === 'longestBetween' && longestPathBetween && 
          isLinkInPath(link, longestPathBetween)) {
        return colors.longestBetweenDark; // Dark amber for highlighted longest between path
      }
      
      if (highlightedFilter === 'longestOverall' && longestPath && 
          isLinkInPath(link, longestPath)) {
        return colors.longestOverallDark; // Dark rose for highlighted longest overall path
      }
      
      return '#aaa'; // Gray for non-highlighted (shouldn't happen with proper filtering)
    }
    
    // Determine color based on path membership and filter settings
    if (filters.longestOverall && longestPath && longestPath.route && isLinkInPath(link, longestPath)) 
      return colors.longestOverall; // Rose for overall longest
      
    if (filters.longestBetween && longestPathBetween && longestPathBetween.route && isLinkInPath(link, longestPathBetween)) 
      return colors.longestBetween; // Amber for longest between selected
      
    if (filters.fastest && paths && paths.length > 0 && paths[0] && isLinkInPath(link, paths[0])) 
      return colors.fastest; // Cyan for fastest path only
      
    if (filters.alternative && paths && paths.length > 1) {
      // Check all alternative paths (paths after first one)
      for (let i = 1; i < paths.length; i++) {
        if (paths[i] && isLinkInPath(link, paths[i])) {
          return colors.alternative; // Indigo for alternatives
        }
      }
    }
    
    return '#8b5cf6'; // Purple for others (fallback)
  };

  // Helper function to check if a link is part of a specific path
  const isLinkInPath = (link: Link, path: Path): boolean => {
    if (!path || !path.route || !Array.isArray(path.route)) return false;
    
    const { route } = path;
    const source = (typeof link.source === 'string') ? link.source : link.source.id;
    const target = (typeof link.target === 'string') ? link.target : link.target.id;
    
    for (let i = 0; i < route.length - 1; i++) {
      const pathSource = route[i];
      const pathTarget = route[i + 1];
      
      if (
        (pathSource === source && pathTarget === target) ||
        (pathSource === target && pathTarget === source)
      ) {
        return true;
      }
    }
    
    return false;
  };

  // Update the visualization when the component mounts or data changes
  useEffect(() => {
    if (!svgRef.current) return;

    // Update dimensions
    const svgContainer = svgRef.current.parentElement;
    if (svgContainer) {
      setDimensions({
        width: svgContainer.clientWidth,
        height: svgContainer.clientHeight,
      });
    }
    
    // Log current state of coordinates data
    console.log('[NetworkVisualizer] Mounting, checking coordinates data:', {
      hasData: hasCoordinatesData(),
      dimWidth: svgContainer?.clientWidth,
      dimHeight: svgContainer?.clientHeight
    });
  }, []);

  // Create and update the visualization
  useEffect(() => {
    if (!svgRef.current || !graph || dimensions.width === 0 || !isCoordinatesReady) {
      if (!isCoordinatesReady) {
        console.log('[NetworkVisualizer] Waiting for coordinates data...');
      }
      return;
    }

    console.log("[NetworkVisualizer] Starting visualization update", {
      graph: !!graph,
      dimensions,
      hasCoordinateData: hasCoordinatesData()
    });
    
    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    const { nodes, links } = buildGraphData();
    
    // Create SVG element
    const svg = d3.select(svgRef.current)
      .attr('width', dimensions.width)
      .attr('height', dimensions.height);

    // Create a group for zoom/pan
    const g = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Create helper functions for geographic projections
    const geoProjection = (longitude: number, latitude: number, width: number, height: number): [number, number] => {
      // Validate input to prevent NaN errors
      if (!isValidCoordinate(longitude, latitude) || !isValidCoordinate(width, height)) {
        console.error(`Invalid geoProjection input: longitude=${longitude}, latitude=${latitude}, width=${width}, height=${height}`);
        return [width / 2, height / 2]; // Return center as fallback
      }
      
      // Simple equirectangular projection (we're not showing the actual map, just approximating positions)
      // Adjust longitude range to center on the Atlantic (-30 to -180 degrees becomes left half, -30 to 180 becomes right half)
      const centerLongitude = 0;
      
      // Normalize longitude to -180 to 180 range
      let lon = longitude;
      while (lon > 180) lon -= 360;
      while (lon < -180) lon += 360;
      
      // Map longitude from -180,180 to 0,1 (with adjustment to center on desired longitude)
      const x = ((lon - centerLongitude + 180) % 360) / 360;
      
      // Map latitude from -90,90 to 1,0 (inverted because SVG y-axis is top-down)
      // Use a slight adjustment to avoid extreme stretching at poles
      const lat = Math.max(-85, Math.min(85, latitude)); // Clamp latitude to avoid extreme stretching
      const y = (90 - lat) / 180;
      
      // Scale to fit visualization area with padding
      const padding = 60;
      const projectedX = padding + x * (width - padding * 2);
      const projectedY = padding + y * (height - padding * 2);
      
      // Validate output
      if (!isValidCoordinate(projectedX, projectedY)) {
        console.error(`Invalid geoProjection output: [${projectedX}, ${projectedY}]`);
        return [width / 2, height / 2]; // Return center as fallback
      }
      
      return [projectedX, projectedY];
    };
    
    // Calculate initial positions based on geographic coordinates
    nodes.forEach(node => {
      if (node.id === sourceRegion) {
        // Fix source node to left middle
        node.fx = dimensions.width * 0.1;
        node.fy = dimensions.height / 2;
      }
      else if (node.id === targetRegion) {
        // Fix destination node to right middle
        node.fx = dimensions.width * 0.9;
        node.fy = dimensions.height / 2;
      }
      else {
        // Position based on geographic coordinates
        const [x, y] = geoProjection(node.longitude, node.latitude, dimensions.width, dimensions.height);
        
        // Validate the projected coordinates
        if (!isValidCoordinate(x, y)) {
          console.warn(`Invalid geographic projection for node ${node.id}:`, { x, y, node });
          // Fallback to center position
          node.x = dimensions.width / 2;
          node.y = dimensions.height / 2;
        } else {
          node.x = x;
          node.y = y;
        }
      }
    });
    
    // Validate all node positions before starting simulation
    nodes.forEach(node => {
      if (!isValidCoordinate(node.x, node.y)) {
        console.warn(`Node ${node.id} has invalid coordinates before simulation:`, { x: node.x, y: node.y });
        // Reset to center position
        node.x = dimensions.width / 2;
        node.y = dimensions.height / 2;
      }
    });

    // Create the simulation with geographic positioning
    const simulation = d3.forceSimulation<Node, Link>(nodes)
      .force('link', d3.forceLink<Node, Link>(links)
        .id(d => d.id)
        .distance(d => {
          // More intuitive distance scaling based on latency
          return Math.min(200, Math.max(80, d.value * 0.8));
        })
      )
      .force('charge', d3.forceManyBody().strength(-200)) // Reduced strength to allow geographic positioning
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2).strength(0.05))
      // Custom force to maintain geographic positions
      .force('geographic', alpha => {
        nodes.forEach(d => {
          if (d.id !== sourceRegion && d.id !== targetRegion) {
            // Calculate ideal position based on geographic coordinates
            const [idealX, idealY] = geoProjection(d.longitude, d.latitude, dimensions.width, dimensions.height);
            
            // Pull node toward its geographic position with a moderate strength
            // This allows some flexibility for the force layout to avoid overlaps
            const strengthFactor = 0.3 * alpha;
            d.vx = (d.vx || 0) + (idealX - (d.x || 0)) * strengthFactor;
            d.vy = (d.vy || 0) + (idealY - (d.y || 0)) * strengthFactor;
          }
        });
      })
      .force('collision', d3.forceCollide().radius(35)); // Prevent node overlap

    // Create a white shadow for better text readability
    const defs = svg.append("defs");
    defs.append("filter")
        .attr("id", "text-shadow")
        .append("feDropShadow")
        .attr("dx", 0)
        .attr("dy", 0)
        .attr("stdDeviation", 2)
        .attr("flood-color", "white")
        .attr("flood-opacity", 0.8);

    // Create marker for arrowheads
    defs.append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", 0)
        .attr("orient", "auto")
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#999");

    // Create links with curved paths and animated dash patterns for highlighted paths
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(links)
      .enter()
      .append('path')
      .attr('stroke-width', d => {
        // Make important paths more visible
        if (d.highlighted) {
          return Math.max(2.5, 4 - d.value / 40);
        }
        return Math.max(1, 2 - d.value / 60);
      })
      .attr('stroke', d => getLinkColor(d))
      .attr('fill', 'none')
      .attr('opacity', d => d.highlighted ? 1 : 0.25)
      .attr('stroke-dasharray', d => d.highlighted ? '5,5' : '0')
      .attr('stroke-linecap', 'round');
      
    // Add animation to the highlighted paths
    link.filter(d => d.highlighted)
      .append('animate')
      .attr('attributeName', 'stroke-dashoffset')
      .attr('values', '0;10')
      .attr('dur', '0.5s')
      .attr('repeatCount', 'indefinite');
      
    // Add animated particles for data flow along highlighted paths
    const animatedLinks = links.filter(d => d.highlighted);
    
    // Create particles group
    const particles = g.append('g')
      .attr('class', 'particles');
    
    // Create particles for each highlighted link
    animatedLinks.forEach(link => {
      const particleCount = 3; // Number of particles per link
      const particleRadius = 3; // Particle size
      
      for (let i = 0; i < particleCount; i++) {
        particles.append('circle')
          .attr('r', particleRadius)
          .attr('fill', getLinkColor(link))
          .attr('opacity', 0.8)
          .attr('filter', 'url(#glow)')
          .attr('class', 'particle')
          .datum({
            link: link,
            speed: 0.02 + Math.random() * 0.02, // Random speed
            offset: i / particleCount, // Distribute particles along the path
            pathNode: null as SVGPathElement | null
          });
      }
    });

    // Create circles for RTT time indicators
    const linkCircles = g.append('g')
      .attr('class', 'link-indicators')
      .selectAll('circle')
      .data(links)
      .enter()
      .append('circle')
      .attr('r', 10)
      .attr('fill', 'white')
      .attr('stroke', d => getLinkColor(d))
      .attr('stroke-width', 1.5)
      .attr('opacity', d => d.highlighted ? 0.9 : 0.6);

    // Add latency labels inside circles
    const linkLabels = g.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(links)
      .enter()
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '8px')
      .attr('font-weight', 'bold')
      .attr('filter', 'url(#text-shadow)')
      .text(d => `${d.value}`)
      .attr('fill', d => d.highlighted ? d.value < 50 ? '#047857' : d.value < 100 ? '#b45309' : '#b91c1c' : '#64748b')
      .attr('opacity', 1);

    // Create nodes with enhanced styling
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any
      );
    
    // Create distinctive source and target nodes
    // First, add special markers for source and target
    node.filter(d => d.id === sourceRegion || d.id === targetRegion)
      .append('circle')
      .attr('r', 16)
      .attr('fill', 'white')
      .attr('stroke', d => d.id === sourceRegion ? colors.source : colors.target)
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '3,2')
      .attr('opacity', 0.6);
      
    // Then add icons or distinctive shapes for source and target
    // Source node (outgoing arrow icon)
    node.filter(d => d.id === sourceRegion)
      .append('path')
      .attr('d', 'M-4,-4 L4,0 L-4,4 Z') // Simple right-pointing arrow
      .attr('fill', colors.source)
      .attr('transform', 'translate(4, 0)');
      
    // Target node (target icon)
    node.filter(d => d.id === targetRegion)
      .append('circle')
      .attr('r', 4)
      .attr('fill', colors.target)
      .attr('stroke', 'white')
      .attr('stroke-width', 1);
    
    // Create node circles with pulsing animation for all nodes
    node.append('circle')
      .attr('r', d => {
        if (d.id === sourceRegion || d.id === targetRegion) return 12;
        return d.highlighted ? 10 : 6;
      })
      .attr('fill', d => {
        if (d.id === sourceRegion) return colors.source; // Green for source
        if (d.id === targetRegion) return colors.target; // Red for target
        
        if (!d.highlighted) return colors.inactive; // Gray for non-highlighted
        
        // Different colors based on the node group
        switch (d.group) {
          case 3: return colors.longestOverall; // Rose for overall longest path
          case 4: return colors.fastest; // Cyan for fastest path
          case 5: return colors.alternative; // Indigo for alternative paths
          case 6: return colors.longestBetween; // Amber for longest path between selection
          default: return '#8b5cf6'; // Purple for default
        }
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', d => d.highlighted ? 3 : 2)
      .attr('filter', 'url(#glow)');
    
    // Add glow filter for highlighted nodes
    const glowFilter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    
    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '2')
      .attr('result', 'coloredBlur');
      
    const glowMerge = glowFilter.append('feMerge');
    glowMerge.append('feMergeNode').attr('in', 'coloredBlur');
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    
    // Add pulsing animation for source and target nodes
    node.filter(d => d.id === sourceRegion || d.id === targetRegion)
      .select('circle')
      .append('animate')
      .attr('attributeName', 'r')
      .attr('values', (d, i) => d.id === sourceRegion ? '12;14;12' : '12;14;12')
      .attr('dur', '2s')
      .attr('repeatCount', 'indefinite');
    
    // Create readable labels with background
    const nodeLabels = node.append('text')
      .attr('dy', -18)
      .attr('text-anchor', 'middle')
      .attr('font-size', d => (d.id === sourceRegion || d.id === targetRegion) ? '15px' : (d.highlighted ? '14px' : '12px'))
      .attr('font-weight', d => (d.id === sourceRegion || d.id === targetRegion) ? 'bold' : (d.highlighted ? 'bold' : 'normal'))
      .attr('class', 'node-label')
      .text(d => {
        if (d.id === sourceRegion) return `${d.id} (Source)`;
        if (d.id === targetRegion) return `${d.id} (Target)`;
        return d.id;
      });
      
    // Add small role indicator below source and target nodes
    node.filter(d => d.id === sourceRegion || d.id === targetRegion)
      .append('text')
      .attr('dy', 24)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('class', 'node-role')
      .attr('fill', d => d.id === sourceRegion ? colors.source : colors.target)
      .text(d => d.id === sourceRegion ? 'SOURCE' : 'TARGET');
    
    // Add white background for label text for better readability
    node.append('rect')
      .attr('width', function(d) { 
        const textNode = nodeLabels.filter(textD => textD === d).node();
        const padding = (d.id === sourceRegion || d.id === targetRegion) ? 16 : 10;
        return textNode ? textNode.getComputedTextLength() + padding : 0;
      })
      .attr('height', function(d) {
        return (d.id === sourceRegion || d.id === targetRegion) ? 24 : 20;
      })
      .attr('x', function(d) { 
        const textNode = nodeLabels.filter(textD => textD === d).node();
        const padding = (d.id === sourceRegion || d.id === targetRegion) ? 8 : 5;
        return textNode ? -textNode.getComputedTextLength()/2 - padding : 0;
      })
      .attr('y', function(d) {
        return (d.id === sourceRegion || d.id === targetRegion) ? -32 : -30;
      })
      .attr('fill', d => {
        if (d.id === sourceRegion) return '#e6f7ef'; // Light green for source
        if (d.id === targetRegion) return '#fee2e2'; // Light red for target
        return 'white';
      })
      .attr('fill-opacity', 0.85)
      .attr('stroke', d => {
        if (d.id === sourceRegion) return colors.source; // Green border for source
        if (d.id === targetRegion) return colors.target; // Red border for target
        return 'transparent';
      })
      .attr('stroke-width', d => (d.id === sourceRegion || d.id === targetRegion) ? 1 : 0)
      .attr('rx', 5)
      .attr('ry', 5);
      
    // Add white background for role indicator text
    node.filter(d => d.id === sourceRegion || d.id === targetRegion)
      .append('rect')
      .attr('width', 70)
      .attr('height', 18)
      .attr('x', -35)
      .attr('y', 16)
      .attr('fill', d => {
        if (d.id === sourceRegion) return '#e6f7ef'; // Light green for source
        if (d.id === targetRegion) return '#fee2e2'; // Light red for target
        return 'white';
      })
      .attr('fill-opacity', 0.85)
      .attr('rx', 9)
      .attr('ry', 9);
    
    // Bring text to front
    node.each(function() {
      const g = d3.select(this);
      g.selectAll('text').raise();
    });
    
    // Add title for tooltips with detailed information
    node.append('title')
      .text(d => {
        let title = `Region: ${d.id}`;
        if (d.id === sourceRegion) title += ' (Source)';
        if (d.id === targetRegion) title += ' (Target)';
        
        // Add geographic coordinates to tooltip
        title += `\nCoordinates: ${d.latitude.toFixed(2)}°N, ${d.longitude.toFixed(2)}°E`;
        
        // Find connected regions and their latencies
        const connections = links
          .filter(link => (typeof link.source === 'object' && link.source.id === d.id) || 
                          (typeof link.source === 'string' && link.source === d.id) ||
                          (typeof link.target === 'object' && link.target.id === d.id) ||
                          (typeof link.target === 'string' && link.target === d.id))
          .map(link => {
            const connectedNode = (typeof link.source === 'object' && link.source.id === d.id) ? 
                                  (typeof link.target === 'object' ? link.target.id : link.target) : 
                                  (typeof link.source === 'object' ? link.source.id : link.source);
            return `\n→ ${connectedNode}: ${link.value}ms`;
          })
          .join('');
        
        return title + '\n\nConnections:' + connections;
      });

    // Update positions on each tick of the simulation
    simulation.on('tick', () => {
      // First, validate all node positions to prevent NaN propagation
      nodes.forEach(node => {
        if (!isValidCoordinate(node.x, node.y)) {
          console.warn(`Invalid node position detected for ${node.id}:`, { x: node.x, y: node.y });
          // Reset to a safe position
          node.x = dimensions.width / 2;
          node.y = dimensions.height / 2;
        }
      });
      
      // Update link paths with curves using safe path generator
      link.attr('d', d => {
        const source = d.source as Node;
        const target = d.target as Node;
        
        // Guard against undefined nodes
        if (!source || !target) {
          console.warn('Missing source or target for link:', d);
          return '';
        }

        // Additional validation for source and target coordinates
        if (!isValidCoordinate(source.x, source.y) || !isValidCoordinate(target.x, target.y)) {
          console.warn('Invalid coordinates for link:', d, { source, target });
          return '';
        }
        
        // Use safe path generator to avoid NaN errors
        const curvature = (source.x !== undefined && 
                           source.y !== undefined && 
                           target.x !== undefined && 
                           target.y !== undefined) ?
          Math.sqrt(Math.pow(target.x - source.x, 2) + Math.pow(target.y - source.y, 2)) < 40 ? 0 : 0.15 : 0;
        
        return generateSafePath(
          { x: source.x || 0, y: source.y || 0 },
          { x: target.x || 0, y: target.y || 0 },
          curvature
        );
      });
      
      // Animate particles along paths
      particles.selectAll('circle.particle')
        .each(function(d: any) {
          // Get path node for this particle if not already stored
          if (!d.pathNode) {
            try {
              // Find the corresponding path for this particle's link
              const linkData = d.link;
              const linkSource = typeof linkData.source === 'string' ? linkData.source : 
                               (linkData.source && 'id' in linkData.source) ? linkData.source.id : null;
              const linkTarget = typeof linkData.target === 'string' ? linkData.target : 
                               (linkData.target && 'id' in linkData.target) ? linkData.target.id : null;
              
              // Check if we have valid source/target
              if (!linkSource || !linkTarget) {
                return;
              }
              
              // Select the path element
              const pathElements = link.filter(p => {
                const pSource = typeof p.source === 'string' ? p.source : 
                               (p.source && 'id' in p.source) ? (p.source as any).id : null;
                const pTarget = typeof p.target === 'string' ? p.target : 
                               (p.target && 'id' in p.target) ? (p.target as any).id : null;
                
                if (!pSource || !pTarget) return false;
                
                return (pSource === linkSource && pTarget === linkTarget) || 
                       (pSource === linkTarget && pTarget === linkSource);
              });
              
              if (pathElements.size() > 0) {
                d.pathNode = pathElements.node();
              }
            } catch (err) {
              console.warn('Error finding path node:', err);
            }
          }
          
          // If we have a path node, animate the particle along it
          if (d.pathNode) {
            try {
              const pathLength = d.pathNode.getTotalLength();
              
              // Skip if pathLength is not a valid number
              if (isNaN(pathLength) || pathLength <= 0) {
                return;
              }
              
              // Update position based on speed and offset
              d.offset = (d.offset + d.speed) % 1;
              
              // Get point along the path
              const point = d.pathNode.getPointAtLength(d.offset * pathLength);
              
              // Skip if point coordinates are not valid numbers
              if (!point || !isValidCoordinate(point.x, point.y)) {
                return;
              }
              
              // Update particle position
              d3.select(this)
                .attr('cx', point.x)
                .attr('cy', point.y);
            } catch (err) {
              console.warn('Error animating particle:', err);
            }
          }
        });

      // Update link indicator circles
      linkCircles.attr('cx', d => {
        const source = d.source as Node;
        const target = d.target as Node;
        
        // Guard against undefined nodes
        if (!source || !target) {
          return 0; // Place off-screen if invalid
        }
        
        // Extract coordinates with default values
        const sourceX = source.x || 0;
        const sourceY = source.y || 0;
        const targetX = target.x || 0;
        const targetY = target.y || 0;
        
        // Validate coordinates
        if (!isValidCoordinate(sourceX, sourceY) || !isValidCoordinate(targetX, targetY)) {
          return 0;
        }
        
        // Calculate midpoint for the circle
        const midX = (sourceX + targetX) / 2;
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const norm = Math.sqrt(dx * dx + dy * dy);
        
        // Add slight offset for the circle position
        const offsetX = -dy * 0.15;
        return midX + (norm < 40 ? 0 : offsetX);
      })
      .attr('cy', d => {
        const source = d.source as Node;
        const target = d.target as Node;
        
        // Guard against undefined nodes
        if (!source || !target) {
          return 0; // Place off-screen if invalid
        }
        
        // Extract coordinates with default values
        const sourceX = source.x || 0;
        const sourceY = source.y || 0;
        const targetX = target.x || 0;
        const targetY = target.y || 0;
        
        // Validate coordinates
        if (!isValidCoordinate(sourceX, sourceY) || !isValidCoordinate(targetX, targetY)) {
          return 0;
        }
        
        // Calculate midpoint for the circle
        const midY = (sourceY + targetY) / 2;
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const norm = Math.sqrt(dx * dx + dy * dy);
        
        // Add slight offset for the circle position
        const offsetY = dx * 0.15;
        return midY + (norm < 40 ? 0 : offsetY);
      });

      // Update link label positions
      linkLabels.attr('x', d => {
        const source = d.source as Node;
        const target = d.target as Node;
        
        // Guard against undefined nodes
        if (!source || !target) {
          return 0; // Place off-screen if invalid
        }
        
        // Extract coordinates with default values
        const sourceX = source.x || 0;
        const sourceY = source.y || 0;
        const targetX = target.x || 0;
        const targetY = target.y || 0;
        
        // Validate coordinates
        if (!isValidCoordinate(sourceX, sourceY) || !isValidCoordinate(targetX, targetY)) {
          return 0;
        }
        
        // Position text at the same location as the circle
        const midX = (sourceX + targetX) / 2;
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const norm = Math.sqrt(dx * dx + dy * dy);
        
        // Add slight offset for the label position
        const offsetX = -dy * 0.15;
        return midX + (norm < 40 ? 0 : offsetX);
      })
      .attr('y', d => {
        const source = d.source as Node;
        const target = d.target as Node;
        
        // Guard against undefined nodes
        if (!source || !target) {
          return 0; // Place off-screen if invalid
        }
        
        // Extract coordinates with default values
        const sourceX = source.x || 0;
        const sourceY = source.y || 0;
        const targetX = target.x || 0;
        const targetY = target.y || 0;
        
        // Validate coordinates
        if (!isValidCoordinate(sourceX, sourceY) || !isValidCoordinate(targetX, targetY)) {
          return 0;
        }
        
        // Position text at the same location as the circle
        const midY = (sourceY + targetY) / 2;
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const norm = Math.sqrt(dx * dx + dy * dy);
        
        // Add slight offset for the label position
        const offsetY = dx * 0.15;
        return midY + (norm < 40 ? 0 : offsetY);
      });

      // Constrain nodes to the visualization area
      node
        .attr('transform', d => {
          // Handle undefined or NaN values
          if (!isValidCoordinate(d.x, d.y)) {
            // Assign default position in the center
            d.x = dimensions.width / 2;
            d.y = dimensions.height / 2;
          } else {
            // Constrain to visualization area
            d.x = Math.max(25, Math.min(dimensions.width - 25, d.x));
            d.y = Math.max(25, Math.min(dimensions.height - 25, d.y));
          }
          return `translate(${d.x},${d.y})`;
        });
    });

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, Node, Node>, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      
      // Only set initial position if not source or target node
      if (d.id !== sourceRegion && d.id !== targetRegion) {
        d.fx = d.x;
        d.fy = d.y;
      }
    }

    function dragged(event: d3.D3DragEvent<SVGCircleElement, Node, Node>, d: Node) {
      // Only allow dragging if not source or target node
      if (d.id !== sourceRegion && d.id !== targetRegion) {
        d.fx = event.x;
        d.fy = event.y;
      }
    }

    function dragended(event: d3.D3DragEvent<SVGCircleElement, Node, Node>, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
      
      // Keep nodes in place after dragging for better user experience
      // If it's not source or target, we could optionally release:
      // if (d.id !== sourceRegion && d.id !== targetRegion) {
      //   d.fx = null;
      //   d.fy = null;
      // }
    }

    // Add visual path indication between source and target
    if (sourceRegion && targetRegion) {
      // Add a faint directional arrow in the background to show the overall flow
      g.append('path')
        .attr('d', `M ${dimensions.width * 0.1},${dimensions.height / 2} L ${dimensions.width * 0.9},${dimensions.height / 2}`)
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 10)
        .attr('stroke-dasharray', '8,4')
        .attr('marker-end', 'url(#arrowhead)')
        .attr('opacity', 0.5)
        .attr('fill', 'none')
        .lower(); // Ensure it's in the background
    }
    
    // Add subtle geographical boundary hints
    // Define major continents with approximate positions
    const continents = [
      { name: "North America", lon: -100, lat: 40 },
      { name: "South America", lon: -60, lat: -20 },
      { name: "Europe", lon: 10, lat: 50 },
      { name: "Africa", lon: 20, lat: 0 },
      { name: "Asia", lon: 100, lat: 35 },
      { name: "Australia", lon: 135, lat: -25 }
    ];
    
    // Add continent labels
    const continentLabels = g.append('g')
      .attr('class', 'continent-labels')
      .selectAll('text')
      .data(continents)
      .enter()
      .append('g');
      
    // Add faint background rectangles for the continents
    continentLabels.append('rect')
      .attr('x', d => {
        const [x, y] = geoProjection(d.lon, d.lat, dimensions.width, dimensions.height);
        return x - 50;
      })
      .attr('y', d => {
        const [x, y] = geoProjection(d.lon, d.lat, dimensions.width, dimensions.height);
        return y - 40;
      })
      .attr('width', 100)
      .attr('height', 30)
      .attr('rx', 15)
      .attr('ry', 15)
      .attr('fill', '#f8fafc')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 0.4);
      
    // Add continent text labels
    continentLabels.append('text')
      .attr('x', d => {
        const [x, y] = geoProjection(d.lon, d.lat, dimensions.width, dimensions.height);
        return x;
      })
      .attr('y', d => {
        const [x, y] = geoProjection(d.lon, d.lat, dimensions.width, dimensions.height);
        return y - 20;
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#94a3b8')
      .attr('opacity', 0.6)
      .text(d => d.name);
    
    // Add subtle curved paths representing oceans
    const oceans = [
      { name: "Pacific", points: [ [-150, 0], [-120, 20], [-100, 0], [-120, -20] ] },
      { name: "Atlantic", points: [ [-50, 40], [-20, 20], [-30, 0], [-20, -20] ] },
      { name: "Indian", points: [ [60, 0], [80, 10], [90, 0], [80, -20] ] }
    ];
    
    // Add ocean paths
    g.append('g')
      .attr('class', 'ocean-paths')
      .selectAll('path')
      .data(oceans)
      .enter()
      .append('path')
      .attr('d', d => {
        const points = d.points.map(([lon, lat]) => {
          return geoProjection(lon, lat, dimensions.width, dimensions.height);
        });
        
        return d3.line()
          .curve(d3.curveBasisClosed)
          (points.map(p => [p[0], p[1]]));
      })
      .attr('fill', 'none')
      .attr('stroke', '#bfdbfe')
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '2,8')
      .attr('opacity', 0.3)
      .lower(); // Ensure it's in the background
    
    // Automatically center the visualization
    svg.call(zoom.transform as any, d3.zoomIdentity.translate(
      dimensions.width / 2 - dimensions.width * 0.4,
      dimensions.height / 2 - dimensions.height * 0.4
    ).scale(0.8));

    // Clean up
    return () => {
      simulation.stop();
    };
  }, [graph, paths, longestPath, longestPathBetween, sourceRegion, targetRegion, dimensions, filters, highlightedFilter, isCoordinatesReady]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!svgRef.current) return;
      
      const svgContainer = svgRef.current.parentElement;
      if (svgContainer) {
        setDimensions({
          width: svgContainer.clientWidth,
          height: svgContainer.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-full h-full min-h-[400px] relative">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ minHeight: '400px', backgroundColor: '#f8fafc' }}
      ></svg>
    </div>
  );
};
