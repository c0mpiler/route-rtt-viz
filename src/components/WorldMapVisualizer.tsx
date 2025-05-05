/**
 * WorldMapVisualizer - Interactive world map visualization component
 *
 * This component creates a detailed interactive world map showing IBM Cloud regions
 * and the network paths between them using D3.js.
 */
import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { geoPath, geoGraticule } from "d3-geo";
import { geoRobinson } from "d3-geo-projection";
import { NetworkGraph } from "@utils/network/NetworkGraph";
import { Path } from "@types/network";
import { categorizeLatency, LatencyCategory } from "@utils/formatters";
import {
  CoordinatesData,
  getFlatRegionCoordinates,
  getRegionCoordinates,
  loadCoordinatesData,
} from "@utils/loadCoordinatesData";
import {
  isValidCoordinate,
  getSafeCoordinates,
  generateSafePath,
  getSafePointAlongQuadCurve,
} from "@utils/visualization";
import { useFilter } from "@context/FilterContext";
import { FilterableLegend } from "@components/common/FilterableLegend";

// Default coordinates for regions with unknown locations
const DEFAULT_COORDINATES: [number, number] = [0, 0];

// GeoJSON for world countries
const WORLD_GEOJSON_URL =
  "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

interface WorldMapVisualizerProps {
  graph: NetworkGraph | null;
  paths: Path[];
  longestPath: Path | null;
  longestPathBetween: Path | null;
  sourceRegion: string | null;
  targetRegion: string | null;
}

// Beautiful color palette with improved visibility and vibrant tones
const colors = {
  source: "#059669", // Vibrant emerald green
  target: "#dc2626", // Vibrant ruby red
  fastest: "#0891b2", // Vibrant cyan
  alternative: "#4f46e5", // Vibrant indigo
  longestBetween: "#f59e0b", // Vibrant amber
  longestOverall: "#be123c", // Vibrant rose
  inactive: "#64748b", // Modern slate gray (less muted)
  ocean: {
    light: "#dbeafe", // Lighter blue for gradients
    main: "#bfdbfe", // Main ocean color
    dark: "#93c5fd", // Darker blue for depth
  },
  land: {
    light: "#fef3c7", // Light cream for land
    main: "#f6d55c", // Golden yellow for land
    border: "#d4af37", // Golden border
  },
  graticule: "#94a3b8", // More visible slate gray
  waterEffect: "rgba(59, 130, 246, 0.1)", // Blue water effect
  background: "#f0f9ff", // Soft sky blue background
};

export const WorldMapVisualizer: React.FC<WorldMapVisualizerProps> = ({
  graph,
  paths,
  longestPath,
  longestPathBetween,
  sourceRegion,
  targetRegion,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [worldData, setWorldData] = useState<any>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);

  // Get filter state from context
  const { filters, highlightedFilter } = useFilter();

  // Load and setup world map
  useEffect(() => {
    if (!containerRef.current) return;

    // Get container dimensions
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    setDimensions({ width, height });

    // Fetch world GeoJSON data
    const fetchWorldData = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching world map data...');
        const response = await fetch(WORLD_GEOJSON_URL);
        const data = await response.json();
        console.log('World map data loaded successfully', data);
        setWorldData(data);
      } catch (error) {
        console.error("Error loading world map data:", error);
        // Create a simple fallback world map if GeoJSON fails to load
        const fallbackData = {
          type: "FeatureCollection",
          features: [{
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [[[-180, -60], [180, -60], [180, 60], [-180, 60], [-180, -60]]]
            },
            properties: { name: "World" }
          }]
        };
        setWorldData(fallbackData);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorldData();
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      setDimensions({ width, height });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Store projection in a ref so we can access it across different effects
  const projectionRef = useRef<any>(null);

  // Store coordinates data
  const [coordinatesData, setCoordinatesData] =
    useState<CoordinatesData | null>(null);

  // Load coordinates data
  useEffect(() => {
    const fetchCoordinatesData = async () => {
      try {
        const data = await loadCoordinatesData();
        setCoordinatesData(data);
        console.log("Loaded coordinates data:", data);
      } catch (error) {
        console.error("Failed to load coordinates data:", error);
      }
    };

    fetchCoordinatesData();
  }, []);

  // Function to get coordinates for a region
  const getCoordinatesForD3 = (region: string): [number, number] => {
    if (!coordinatesData) {
      console.log("No coordinatesData available for region:", region);
      return DEFAULT_COORDINATES;
    }
    const coords = getRegionCoordinates(region, coordinatesData);
    console.log(`Coordinates for ${region}:`, coords);
    return coords;
  };

  // Draw the map and paths
  useEffect(() => {
    console.log("Effect triggered with:", {
      svgRef: !!svgRef.current,
      worldData: !!worldData,
      dimensionsWidth: dimensions.width,
      graph: !!graph,
      coordinatesData: !!coordinatesData,
      isLoading
    });

    if (
      !svgRef.current ||
      !worldData ||
      dimensions.width === 0 ||
      !graph ||
      !coordinatesData ||
      isLoading
    ) {
      console.log("Effect early return", {
        svgRef: !!svgRef.current,
        worldData: !!worldData,
        dimensionsWidth: dimensions.width,
        graph: !!graph,
        coordinatesData: !!coordinatesData,
        isLoading
      });
      return;
    }

    console.log("Rendering world map visualization with:", {
      dimensions,
      worldDataType: worldData?.type,
      graphRegionsCount: graph?.getRegions().length,
      coordinatesDataKeys: Object.keys(coordinatesData || {}).length
    });

    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();

    // Create SVG element with slight padding for edge visibility
    const svg = d3
      .select(svgRef.current)
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .attr(
        "viewBox",
        `-20 -20 ${dimensions.width + 40} ${dimensions.height + 40}`,
      );

    // Create defs early for all gradients and filters
    const defs = svg.append("defs");

    // Create map projection (Robinson for better world representation)
    const projection = geoRobinson()
      .scale((dimensions.width - 80) / 2 / Math.PI) // Reduced scale more for better edge visibility
      .translate([dimensions.width / 2, dimensions.height / 2])
      .precision(0.1);

    // Store the projection in the ref for access in other effects
    projectionRef.current = projection;

    // Create a path generator
    const pathGenerator = geoPath().projection(projection);

    // Add zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.8, 8]) // Allow zooming out more for better visibility
      .on("zoom", (event) => {
        mapGroup.attr("transform", event.transform);

        // Scale the circles and text inversely to maintain size
        const scale = 1 / event.transform.k;
        regionsGroup
          .selectAll("circle")
          .attr("r", (d) =>
            isRegionHighlighted(d.id) ? 6 * scale : 4 * scale,
          );

        regionsGroup.selectAll("text").style("font-size", `${scale * 12}px`);

        // Update path stroke width to maintain visual consistency
        pathsGroup
          .selectAll("path")
          .attr("stroke-width", (d) => (d.highlighted ? 2 * scale : 1 * scale));

        // Update particles size
        particlesGroup.selectAll("circle").attr("r", scale * 3);
      });

    svg.call(zoom as any);

    // Add a beautiful sky blue background as the canvas
    svg
      .append("rect")
      .attr("x", -20)
      .attr("y", -20)
      .attr("width", dimensions.width + 40)
      .attr("height", dimensions.height + 40)
      .attr("fill", colors.background)
      .attr("pointer-events", "all");

    // Create groups for layering
    const mapGroup = svg.append("g");
    const oceanGroup = mapGroup.append("g").attr("class", "ocean");
    const countriesGroup = mapGroup.append("g").attr("class", "countries");
    const pathsGroup = mapGroup.append("g").attr("class", "paths");
    const regionsGroup = mapGroup.append("g").attr("class", "regions");
    const labelsGroup = mapGroup.append("g").attr("class", "labels");
    const particlesGroup = mapGroup.append("g").attr("class", "particles");

    // Add a beautiful ocean background with gradients
    const oceanGradient = defs
      .append("linearGradient")
      .attr("id", "oceanGradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
    
    oceanGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", colors.ocean.light)
      .attr("stop-opacity", 1);
    
    oceanGradient.append("stop")
      .attr("offset", "50%")
      .attr("stop-color", colors.ocean.main)
      .attr("stop-opacity", 1);
    
    oceanGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", colors.ocean.dark)
      .attr("stop-opacity", 1);

    // Add ocean waves pattern
    const waves = defs
      .append("pattern")
      .attr("id", "waves")
      .attr("patternUnits", "userSpaceOnUse")
      .attr("width", 100)
      .attr("height", 20)
      .attr("patternTransform", "rotate(45)");
    
    waves.append("rect")
      .attr("width", 100)
      .attr("height", 20)
      .attr("fill", "none");
    
    waves.append("path")
      .attr("d", "M 0 10 Q 25 5 50 10 T 100 10")
      .attr("stroke", colors.waterEffect)
      .attr("stroke-width", 2)
      .attr("fill", "none");

    // Add ocean background with proper z-index
    oceanGroup
      .append("rect")
      .attr("x", -dimensions.width)
      .attr("y", -dimensions.height)
      .attr("width", dimensions.width * 3)
      .attr("height", dimensions.height * 3)
      .attr("fill", "url(#oceanGradient)");

    // Add gradient for land masses
    const landGradient = defs
      .append("linearGradient")
      .attr("id", "landGradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "100%");
    
    landGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", colors.land.light)
      .attr("stop-opacity", 1);
    
    landGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", colors.land.main)
      .attr("stop-opacity", 1);

    // Create other filters early
    // Glow filter
    const glowFilter = defs
      .append("filter")
      .attr("id", "glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");

    glowFilter
      .append("feGaussianBlur")
      .attr("stdDeviation", "3")
      .attr("result", "coloredBlur");

    const glowMerge = glowFilter.append("feMerge");
    glowMerge.append("feMergeNode").attr("in", "coloredBlur");
    glowMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Subtle glow for non-highlighted points
    const subtleGlow = defs
      .append("filter")
      .attr("id", "subtleGlow")
      .attr("x", "-30%")
      .attr("y", "-30%")
      .attr("width", "160%")
      .attr("height", "160%");

    subtleGlow
      .append("feGaussianBlur")
      .attr("stdDeviation", "1.5")
      .attr("result", "subtleBlur");

    const subtleMerge = subtleGlow.append("feMerge");
    subtleMerge.append("feMergeNode").attr("in", "subtleBlur");
    subtleMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Ocean glow effect
    const oceanGlow = defs
      .append("filter")
      .attr("id", "oceanGlow")
      .attr("x", "-10%")
      .attr("y", "-10%")
      .attr("width", "120%")
      .attr("height", "120%");
    
    oceanGlow
      .append("feGaussianBlur")
      .attr("stdDeviation", "2")
      .attr("result", "blur");
    
    oceanGlow
      .append("feComposite")
      .attr("in", "SourceGraphic")
      .attr("in2", "blur")
      .attr("operator", "over");

    // Land shadow filter
    const landShadow = defs
      .append("filter")
      .attr("id", "landShadow")
      .attr("x", "-5%")
      .attr("y", "-5%")
      .attr("width", "110%")
      .attr("height", "110%");
    
    landShadow
      .append("feDropShadow")
      .attr("dx", "2")
      .attr("dy", "2")
      .attr("stdDeviation", "2")
      .attr("flood-opacity", "0.2");

    // Add path glow filter
    const pathGlow = defs
      .append("filter")
      .attr("id", "pathGlow")
      .attr("x", "-10%")
      .attr("y", "-10%")
      .attr("width", "120%")
      .attr("height", "120%");
    
    pathGlow
      .append("feGaussianBlur")
      .attr("stdDeviation", "1")
      .attr("result", "pathBlur");
    
    const pathMerge = pathGlow.append("feMerge");
    pathMerge.append("feMergeNode").attr("in", "pathBlur");
    pathMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Add drop shadow filter for tooltips
    const dropShadow = defs
      .append("filter")
      .attr("id", "drop-shadow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");

    dropShadow
      .append("feGaussianBlur")
      .attr("in", "SourceAlpha")
      .attr("stdDeviation", "3")
      .attr("result", "blur");

    dropShadow
      .append("feOffset")
      .attr("in", "blur")
      .attr("dx", "2")
      .attr("dy", "2")
      .attr("result", "offsetBlur");

    const feComponentTransfer = dropShadow.append("feComponentTransfer");
    feComponentTransfer
      .append("feFuncA")
      .attr("type", "linear")
      .attr("slope", "0.2");

    const shadowMerge = dropShadow.append("feMerge");
    shadowMerge.append("feMergeNode").attr("in", "offsetBlur");
    shadowMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Add arrow markers for paths
    defs
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 4)
      .attr("markerHeight", 4)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#6b7280");

    // Add graticules (latitude/longitude grid lines) with better visibility
    const graticule = geoGraticule();
    mapGroup
      .append("path")
      .datum(graticule)
      .attr("class", "graticule")
      .attr("d", pathGenerator)
      .attr("fill", "none")
      .attr("stroke", colors.graticule)
      .attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "2,4")
      .attr("stroke-opacity", 0.4);

    // Draw countries with vibrant land gradient
    countriesGroup
      .selectAll("path")
      .data(worldData.features)
      .enter()
      .append("path")
      .attr("d", pathGenerator)
      .attr("fill", "url(#landGradient)")
      .attr("stroke", colors.land.border)
      .attr("stroke-width", 0.5)
      .attr("stroke-opacity", 0.8)
      .attr("filter", "url(#landShadow)");

    // Helper function to determine if region is highlighted
    const isRegionHighlighted = (region: string): boolean => {
      if (region === sourceRegion || region === targetRegion) return true;

      // If we have an active highlight, only show regions in that specific path
      if (highlightedFilter) {
        // Handle each highlight filter type
        if (
          highlightedFilter === "fastest" &&
          paths &&
          paths.length > 0 &&
          paths[0] &&
          paths[0].route
        ) {
          return paths[0].route.includes(region);
        }

        if (highlightedFilter === "alternative" && paths && paths.length > 1) {
          for (let i = 1; i < paths.length; i++) {
            if (paths[i] && paths[i].route && paths[i].route.includes(region)) {
              return true;
            }
          }
          return false;
        }

        if (
          highlightedFilter === "longestBetween" &&
          longestPathBetween &&
          longestPathBetween.route
        ) {
          return longestPathBetween.route.includes(region);
        }

        if (
          highlightedFilter === "longestOverall" &&
          longestPath &&
          longestPath.route
        ) {
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
      if (
        !showFastest &&
        !showAlternative &&
        !showLongestBetween &&
        !showLongestOverall
      ) {
        return region === sourceRegion || region === targetRegion;
      }

      // Check if the region is in any of the highlighted paths based on filters
      if (
        showFastest &&
        paths &&
        paths.length > 0 &&
        paths[0] &&
        paths[0].route &&
        paths[0].route.includes(region)
      ) {
        return true; // Fastest path
      }

      if (showAlternative && paths && paths.length > 1) {
        for (let i = 1; i < paths.length; i++) {
          if (paths[i] && paths[i].route && paths[i].route.includes(region)) {
            return true; // Alternative paths
          }
        }
      }

      if (
        showLongestBetween &&
        longestPathBetween &&
        longestPathBetween.route &&
        longestPathBetween.route.includes(region)
      ) {
        return true; // Longest path between selected regions
      }

      if (
        showLongestOverall &&
        longestPath &&
        longestPath.route &&
        longestPath.route.includes(region)
      ) {
        return true; // Overall longest path
      }

      return false;
    };

    // Helper function to get region group type (for coloring)
    const getRegionGroupType = (region: string): number => {
      if (region === sourceRegion) return 1; // Source
      if (region === targetRegion) return 2; // Target

      // If we have an active highlight, only color regions according to that filter
      if (highlightedFilter) {
        // Handle each highlight filter type
        if (
          highlightedFilter === "fastest" &&
          paths &&
          paths.length > 0 &&
          paths[0] &&
          paths[0].route &&
          paths[0].route.includes(region)
        ) {
          return 4; // Fastest path
        }

        if (highlightedFilter === "alternative" && paths && paths.length > 1) {
          for (let i = 1; i < paths.length; i++) {
            if (paths[i] && paths[i].route && paths[i].route.includes(region)) {
              return 5; // Alternative path
            }
          }
        }

        if (
          highlightedFilter === "longestBetween" &&
          longestPathBetween &&
          longestPathBetween.route &&
          longestPathBetween.route.includes(region)
        ) {
          return 6; // Longest between selected regions
        }

        if (
          highlightedFilter === "longestOverall" &&
          longestPath &&
          longestPath.route &&
          longestPath.route.includes(region)
        ) {
          return 3; // Longest overall
        }

        return 0; // Not part of the highlighted path
      }

      // Use filter settings to determine coloring when no specific highlight is active
      const showFastest = filters.fastest;
      const showAlternative = filters.alternative;
      const showLongestBetween = filters.longestBetween;
      const showLongestOverall = filters.longestOverall;

      // Prioritize path types for coloring when a node is in multiple paths
      if (
        showLongestOverall &&
        longestPath &&
        longestPath.route &&
        longestPath.route.includes(region)
      ) {
        return 3; // Longest overall - highest priority for visibility
      }

      if (
        showLongestBetween &&
        longestPathBetween &&
        longestPathBetween.route &&
        longestPathBetween.route.includes(region)
      ) {
        return 6; // Longest between selected regions
      }

      if (
        showFastest &&
        paths &&
        paths.length > 0 &&
        paths[0] &&
        paths[0].route &&
        paths[0].route.includes(region)
      ) {
        return 4; // Fastest path
      }

      if (showAlternative && paths && paths.length > 1) {
        for (let i = 1; i < paths.length; i++) {
          if (paths[i] && paths[i].route && paths[i].route.includes(region)) {
            return 5; // Alternative path found
          }
        }
      }

      return 0; // Default - not part of any highlighted path
    };

    // Get region color based on group type
    const getRegionColor = (region: string): string => {
      const groupType = getRegionGroupType(region);

      switch (groupType) {
        case 1:
          return colors.source; // Green for source
        case 2:
          return colors.target; // Red for target
        case 3:
          return colors.longestOverall; // Rose for longest overall
        case 4:
          return colors.fastest; // Cyan for fastest
        case 5:
          return colors.alternative; // Blue for alternative
        case 6:
          return colors.longestBetween; // Orange for longest between
        default:
          return colors.inactive; // Gray for non-highlighted
      }
    };

    // Add IBM Cloud regions as points
    const regions = graph.getRegions();
    console.log("Regions to render:", regions);
    console.log("Region count:", regions.length);

    // Create region points with enhanced styling
    console.log("Creating region points for", regions.length, "regions");
    regions.forEach(region => {
      const coords = getCoordinatesForD3(region);
      console.log(`Region ${region} coords:`, coords);
      const point = projection(coords);
      console.log(`Region ${region} projected:`, point);
    });

    regionsGroup
      .selectAll("circle")
      .data(
        regions.map((region) => ({
          id: region,
          coordinates: getCoordinatesForD3(region),
        })),
      )
      .enter()
      .append("circle")
      .attr("cx", (d) => {
        const point = projection(d.coordinates);
        if (!point || !isValidCoordinate(point[0], point[1])) {
          console.warn("Invalid projection for region:", d.id, "point:", point, "coordinates:", d.coordinates);
          return 0;
        }
        console.log(`Region ${d.id} positioned at cx:`, point[0]);
        return point[0];
      })
      .attr("cy", (d) => {
        const point = projection(d.coordinates);
        if (!point || !isValidCoordinate(point[0], point[1])) {
          return 0;
        }
        return point[1];
      })
      .attr("r", (d) => (isRegionHighlighted(d.id) ? 8 : 5))
      .attr("fill", (d) => getRegionColor(d.id))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", (d) => (isRegionHighlighted(d.id) ? 3 : 2))
      .attr("filter", (d) =>
        isRegionHighlighted(d.id) ? "url(#glow)" : "url(#subtleGlow)",
      )
      .attr("class", "region-point")
      .on("mouseover", (event, d) => {
        setHoveredRegion(d.id);

        // Enhanced hover effect
        d3.select(event.target)
          .attr("r", 12)
          .attr("stroke-width", 4)
          .attr("filter", "url(#glow)");

        // Show enhanced tooltip
        const point = projection(d.coordinates);
        if (!point) return; // Skip tooltip if projection is invalid

        const [x, y] = point;

        // Remove any existing tooltips first
        mapGroup.selectAll(".tooltip").remove();

        const tooltip = mapGroup
          .append("g")
          .attr("class", "tooltip")
          .attr("transform", `translate(${x}, ${y - 40})`)
          .attr("filter", "url(#drop-shadow)");

        tooltip
          .append("rect")
          .attr("x", -70)
          .attr("y", -40)
          .attr("width", 140)
          .attr("height", 36)
          .attr("rx", 8)
          .attr("ry", 8)
          .attr("fill", "white")
          .attr("stroke", "#e5e7eb")
          .attr("stroke-width", 1);

        // Region name (title)
        tooltip
          .append("text")
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("y", -25)
          .attr("fill", "#111827")
          .attr("font-weight", "bold")
          .attr("font-size", "13px")
          .text(d.id);

        // Add connection count info
        const connections = Object.keys(
          graph?.getConnections(d.id) || {},
        ).length;
        tooltip
          .append("text")
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("y", -10)
          .attr("fill", "#4b5563")
          .attr("font-size", "10px")
          .text(`${connections} direct connections`);

        // Highlight connected paths
        pathsGroup
          .selectAll("path")
          .attr("opacity", (path) => {
            const pathData = path.__data__;
            if (!pathData) return 0.3;

            return pathData.source === d.id || pathData.target === d.id
              ? 1
              : 0.3;
          })
          .attr("stroke-width", (path) => {
            const pathData = path.__data__;
            if (!pathData) return 1;

            return pathData.source === d.id || pathData.target === d.id ? 3 : 1;
          });
      })
      .on("mouseout", (event, d) => {
        setHoveredRegion(null);

        // Restore region appearance
        d3.select(event.target)
          .attr("r", isRegionHighlighted(d.id) ? 6 : 4)
          .attr("stroke-width", isRegionHighlighted(d.id) ? 2 : 1);

        // Remove tooltip
        mapGroup.selectAll(".tooltip").remove();

        // Restore all paths
        pathsGroup
          .selectAll("path")
          .attr("opacity", (path) => {
            const pathData = path.__data__;
            if (!pathData) return 0.6;
            return pathData.highlighted ? 0.8 : 0.6;
          })
          .attr("stroke-width", (path) => {
            const pathData = path.__data__;
            if (!pathData) return 1;
            return pathData.highlighted ? 2 : 1;
          });
      });

    // Handle label visibility
    // First, clear any existing labels
    labelsGroup.selectAll("*").remove();

    // Add region labels
    if (showLabels) {
      // Calculate label positions with collision detection
      const labelPositions: Record<string, { x: number; y: number }> = {};

      // First pass - get initial positions
      regions.forEach((region) => {
        const coords = getCoordinatesForD3(region);
        const point = projection(coords);
        if (!point) return; // Skip if projection is invalid

        const [x, y] = point;

        // Start with position above the point
        labelPositions[region] = {
          x: x,
          y: y - 20, // Initial position above point
        };
      });

      // In the collision detection loop, we need to protect against undefined values
      for (let i = 0; i < regions.length; i++) {
        const regionA = regions[i];
        const posA = labelPositions[regionA];

        // Skip if this region's position wasn't calculated
        if (!posA) continue;

        const widthA = regionA.length * 6 + 10;

        for (let j = i + 1; j < regions.length; j++) {
          const regionB = regions[j];
          const posB = labelPositions[regionB];

          // Skip if this region's position wasn't calculated
          if (!posB) continue;

          const widthB = regionB.length * 6 + 10;

          // Check if labels overlap
          const xOverlap = Math.abs(posA.x - posB.x) < widthA / 2 + widthB / 2;
          const yOverlap = Math.abs(posA.y - posB.y) < 14; // Label height

          if (xOverlap && yOverlap) {
            // Resolve collision by offsetting one label
            // Place regionB's label to the side instead of above
            posB.y = labelPositions[regionB].y + 20;
          }
        }
      }

      // Filter out regions without position data
      const regionsWithLabels = regions.filter(
        (region) => labelPositions[region],
      );

      // Add subtle background behind labels for better readability
      labelsGroup
        .selectAll("rect")
        .data(
          regionsWithLabels.map((region) => ({
            id: region,
            coordinates: getCoordinatesForD3(region),
            position: labelPositions[region],
          })),
        )
        .enter()
        .append("rect")
        .attr("x", (d) => d.position.x - (d.id.length * 3 + 5)) // Center rect based on text length
        .attr("y", (d) => d.position.y - 8) // Position rect around text
        .attr("width", (d) => d.id.length * 6 + 10) // Adjust width based on text length
        .attr("height", 16)
        .attr("rx", 3) // Rounded corners
        .attr("fill", "rgba(255,255,255,0.85)")
        .attr("stroke", "rgba(0,0,0,0.1)")
        .attr("stroke-width", 0.5)
        .attr("opacity", (d) => (isRegionHighlighted(d.id) ? 0.95 : 0.8));

      // Add the text labels
      labelsGroup
        .selectAll("text")
        .data(
          regionsWithLabels.map((region) => ({
            id: region,
            coordinates: getCoordinatesForD3(region),
            position: labelPositions[region],
          })),
        )
        .enter()
        .append("text")
        .attr("x", (d) => d.position.x) // Use calculated position
        .attr("y", (d) => d.position.y) // Use calculated position
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "11px")
        .attr("font-weight", (d) =>
          isRegionHighlighted(d.id) ? "bold" : "normal",
        )
        .attr("fill", "#1f2937")
        .attr("opacity", (d) => (isRegionHighlighted(d.id) ? 1 : 0.8))
        .text((d) => d.id);
    }

    // Create path data for visualization
    const generatePathData = () => {
      const pathData: any[] = [];

      // Determine which paths to include based on filters/highlighting
      const allPaths: Path[] = [];

      // If we have an active highlight, only show paths for that filter
      if (highlightedFilter) {
        // Handle each highlight filter type
        if (
          highlightedFilter === "fastest" &&
          paths &&
          paths.length > 0 &&
          paths[0]
        ) {
          allPaths.push(paths[0]);
        }

        if (highlightedFilter === "alternative" && paths && paths.length > 1) {
          for (let i = 1; i < paths.length; i++) {
            if (paths[i]) allPaths.push(paths[i]);
          }
        }

        if (highlightedFilter === "longestBetween" && longestPathBetween) {
          allPaths.push(longestPathBetween);
        }

        if (highlightedFilter === "longestOverall" && longestPath) {
          allPaths.push(longestPath);
        }
      } else {
        // No specific highlight, use filter settings
        const showFastest = filters.fastest;
        const showAlternative = filters.alternative;
        const showLongestBetween = filters.longestBetween;
        const showLongestOverall = filters.longestOverall;

        // Skip path generation if all filters are off
        if (
          !showFastest &&
          !showAlternative &&
          !showLongestBetween &&
          !showLongestOverall
        ) {
          return pathData; // Return empty array if no path type is selected
        }

        // Add fastest path if filter is enabled
        if (showFastest && paths && paths.length > 0 && paths[0]) {
          allPaths.push(paths[0]);
        }

        // Add alternative paths if filter is enabled
        if (showAlternative && paths && paths.length > 1) {
          for (let i = 1; i < paths.length; i++) {
            if (paths[i]) allPaths.push(paths[i]);
          }
        }

        // Add longest path between selected regions if filter is enabled
        if (showLongestBetween && longestPathBetween) {
          allPaths.push(longestPathBetween);
        }

        // Add overall longest path if filter is enabled
        if (showLongestOverall && longestPath) {
          allPaths.push(longestPath);
        }
      }

      // Create path segments for each path
      allPaths.forEach((path) => {
        // Skip paths without route
        if (!path || !path.route || !Array.isArray(path.route)) return;

        const { route } = path;

        // Determine path properties
        let pathColor = "#3b82f6"; // Default blue
        let highlighted = false;

        if (path === longestPath) {
          pathColor = colors.longestOverall; // Rose for overall longest
          highlighted = true;
        } else if (path === longestPathBetween) {
          pathColor = colors.longestBetween; // Orange for longest between
          highlighted = true;
        } else if (path === paths[0]) {
          pathColor = colors.fastest; // Green for fastest
          highlighted = true;
        } else {
          pathColor = colors.alternative; // Blue for alternatives
          highlighted = true;
        }

        // If a specific filter is highlighted, enhance the appearance for that filter
        if (highlightedFilter) {
          highlighted = true; // All visible paths should be highlighted

          if (highlightedFilter === "fastest" && path === paths[0]) {
            pathColor = "#0891b2"; // Bright cyan
          } else if (
            highlightedFilter === "alternative" &&
            path !== paths[0] &&
            path !== longestPath &&
            path !== longestPathBetween
          ) {
            pathColor = "#4f46e5"; // Bright indigo
          } else if (
            highlightedFilter === "longestBetween" &&
            path === longestPathBetween
          ) {
            pathColor = "#f59e0b"; // Bright amber
          } else if (
            highlightedFilter === "longestOverall" &&
            path === longestPath
          ) {
            pathColor = "#be123c"; // Bright rose
          }
        }

        // Create path segments between adjacent regions
        for (let i = 0; i < route.length - 1; i++) {
          const source = route[i];
          const target = route[i + 1];

          // Skip invalid regions
          if (!source || !target) continue;

          // Get coordinates
          const sourceCoords = getCoordinatesForD3(source);
          const targetCoords = getCoordinatesForD3(target);

          // Project coordinates
          const sourcePoint = projection(sourceCoords);
          const targetPoint = projection(targetCoords);

          // Skip path generation if either projection is invalid
          if (!sourcePoint || !targetPoint) continue;

          // Validate source and target points
          if (
            !isValidCoordinate(sourcePoint[0], sourcePoint[1]) ||
            !isValidCoordinate(targetPoint[0], targetPoint[1])
          ) {
            console.warn("Invalid projected coordinates", { source, target });
            continue;
          }

          // Calculate path data for the curved line
          const dx = targetPoint[0] - sourcePoint[0];
          const dy = targetPoint[1] - sourcePoint[1];
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Calculate control point (curved path)
          // More curved for longer distances
          const curveFactor = Math.min(0.5, Math.max(0.15, dist / 1000));
          const controlPoint = [
            sourcePoint[0] + dx * 0.5 - dy * curveFactor,
            sourcePoint[1] + dy * 0.5 + dx * curveFactor,
          ];

          // Validate control point
          if (!isValidCoordinate(controlPoint[0], controlPoint[1])) {
            console.warn("Invalid control point calculated", {
              source,
              target,
            });
            continue;
          }

          // Generate safe SVG path using our utility
          const pathD = generateSafePath(
            { x: sourcePoint[0], y: sourcePoint[1] },
            { x: targetPoint[0], y: targetPoint[1] },
            curveFactor,
          );

          // Add to path data array
          pathData.push({
            id: `${source}-${target}`,
            d: pathD,
            color: pathColor,
            source,
            target,
            sourcePoint,
            targetPoint,
            controlPoint,
            highlighted,
            path,
          });
        }
      });

      return pathData;
    };

    const pathData = generatePathData();

    // Draw paths
    pathsGroup
      .selectAll("path")
      .data(pathData)
      .enter()
      .append("path")
      .attr("d", (d) => d.d)
      .attr("fill", "none")
      .attr("stroke", (d) => d.color)
      .attr("stroke-width", (d) => (d.highlighted ? 3 : 2))
      .attr("stroke-opacity", (d) => (d.highlighted ? 1 : 0.8))
      .attr("marker-end", (d) => (d.highlighted ? "url(#arrow)" : "none"))
      .attr("stroke-dasharray", (d) => (d.highlighted ? "5,5" : "none"))
      .attr("class", "path-line")
      .attr("filter", "url(#pathGlow)")
      .on("mouseenter", function(event, d) {
        // Highlight the path
        d3.select(this)
          .attr("stroke-width", d.highlighted ? 4 : 3)
          .attr("stroke-opacity", 1);

        // Get RTT data for this specific hop
        const connections = graph?.getConnections(d.source);
        const latency = connections && connections[d.target] 
          ? connections[d.target].toFixed(1) 
          : 'N/A';

        // Find middle of path for tooltip positioning
        const midPoint = getSafePointAlongQuadCurve(
          0.5,
          d.sourcePoint,
          d.controlPoint,
          d.targetPoint
        );

        // Remove any existing tooltips
        mapGroup.selectAll(".path-tooltip").remove();

        // Create tooltip
        const tooltip = mapGroup
          .append("g")
          .attr("class", "path-tooltip")
          .attr("transform", `translate(${midPoint[0]}, ${midPoint[1] - 30})`)
          .attr("filter", "url(#drop-shadow)");

        // Tooltip background
        const textGroup = tooltip.append("g");
        
        // First add text to measure width
        const routeText = `${d.source} → ${d.target}`;
        const latencyText = `RTT: ${latency} ms`;
        
        const titleTextElement = textGroup.append("text")
          .attr("text-anchor", "middle")
          .attr("y", -20)
          .attr("fill", "#111827")
          .attr("font-weight", "bold")
          .attr("font-size", "12px")
          .text(routeText);

        const latencyTextElement = textGroup.append("text")
          .attr("text-anchor", "middle")
          .attr("y", -5)
          .attr("fill", "#374151")
          .attr("font-size", "11px")
          .text(latencyText);

        // Get text width for responsive background
        const titleBBox = (titleTextElement.node() as SVGTextElement).getBBox();
        const latencyBBox = (latencyTextElement.node() as SVGTextElement).getBBox();
        const maxWidth = Math.max(titleBBox.width, latencyBBox.width);

        // Add background rectangle with padding
        tooltip.insert("rect", ":first-child")
          .attr("x", -maxWidth/2 - 8)
          .attr("y", -32)
          .attr("width", maxWidth + 16)
          .attr("height", 40)
          .attr("rx", 4)
          .attr("ry", 4)
          .attr("fill", "rgba(255, 255, 255, 0.98)")
          .attr("stroke", "#e5e7eb")
          .attr("stroke-width", 1);
      })
      .on("mouseleave", function(event, d) {
        // Restore original path appearance
        d3.select(this)
          .attr("stroke-width", d.highlighted ? 2 : 1)
          .attr("stroke-opacity", d.highlighted ? 0.9 : 0.6);
        
        // Remove tooltip with slight delay
        setTimeout(() => {
          mapGroup.selectAll(".path-tooltip").remove();
        }, 150);
      });

    // Animate paths
    pathsGroup
      .selectAll("path")
      .filter((d) => d.highlighted)
      .each(function () {
        const element = d3.select(this);

        // Create animated dash pattern
        element
          .append("animate")
          .attr("attributeName", "stroke-dashoffset")
          .attr("values", "0;10")
          .attr("dur", "1s")
          .attr("repeatCount", "indefinite");
      });

    // Add animated particles for data flow
    pathData
      .filter((d) => d.highlighted)
      .forEach((pathSegment) => {
        const particleCount = 3;

        for (let i = 0; i < particleCount; i++) {
          // Create a particle with data and starting position
          particlesGroup
            .append("circle")
            .datum({
              path: pathSegment,
              progress: i / particleCount,
              speed: 0.01 * (pathSegment.path === paths[0] ? 1.5 : 1), // Faster for shortest path
            })
            .attr("r", 4)
            .attr("fill", pathSegment.color)
            .attr("opacity", 0.9)
            .attr("filter", "url(#glow)")
            .attr("class", "path-particle");
        }
      });

    // Function to calculate point along quadratic bezier curve
    // Using our safe implementation to prevent NaN errors
    const getPointAlongQuadCurve = getSafePointAlongQuadCurve;

    // Animation loop for particles
    const animateParticles = () => {
      particlesGroup.selectAll("circle.path-particle").each(function (d: any) {
        try {
          // Update particle position along the path
          d.progress = (d.progress + d.speed) % 1;

          // Validate path data
          const { sourcePoint, controlPoint, targetPoint } = d.path;
          if (
            !sourcePoint ||
            !controlPoint ||
            !targetPoint ||
            !isValidCoordinate(sourcePoint[0], sourcePoint[1]) ||
            !isValidCoordinate(controlPoint[0], controlPoint[1]) ||
            !isValidCoordinate(targetPoint[0], targetPoint[1])
          ) {
            return;
          }

          // Get coordinates of the current position with safe calculation
          const [x, y] = getPointAlongQuadCurve(
            d.progress,
            sourcePoint,
            controlPoint,
            targetPoint,
          );

          // Validate calculated point
          if (!isValidCoordinate(x, y)) {
            return;
          }

          // Update particle position
          d3.select(this).attr("cx", x).attr("cy", y);
        } catch (error) {
          console.error("Error animating particle:", error);
        }
      });

      // Continue animation
      requestAnimationFrame(animateParticles);
    };

    // Start particle animation
    animateParticles();

    // Start with a slightly zoomed out view to ensure all edges are visible
    const initialZoom = d3.zoomIdentity
      .translate(dimensions.width / 2, dimensions.height / 2)
      .scale(0.9)
      .translate(-dimensions.width / 2, -dimensions.height / 2);

    svg.call(zoom.transform as any, initialZoom);

    return () => {
      // Cleanup animation
      // No need for explicit cancelAnimationFrame since React will unmount this component
    };
  }, [
    dimensions,
    worldData,
    graph,
    paths,
    longestPath,
    longestPathBetween,
    sourceRegion,
    targetRegion,
    hoveredRegion,
    showLabels,
    coordinatesData,
    filters,
    highlightedFilter,
  ]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[700px] relative overflow-hidden"
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 z-10">
          <div className="text-primary-600 font-medium">
            <svg
              className="animate-spin h-8 w-8 mr-2 inline-block"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Loading World Map...
          </div>
        </div>
      )}

      <svg
        ref={svgRef}
        className="w-full h-full block"
        style={{ minHeight: "700px" }}
      ></svg>

      {/* Simplified control for labels - positioned in bottom right */}
      <div className="absolute bottom-4 right-4 z-10">
        <button
          onClick={() => setShowLabels(!showLabels)}
          className="bg-white px-3 py-1.5 rounded-md shadow-sm text-xs font-medium text-primary-800 hover:bg-primary-50 transition-colors"
        >
          {showLabels ? "Hide Labels" : "Show Labels"}
        </button>
      </div>
    </div>
  );
};
