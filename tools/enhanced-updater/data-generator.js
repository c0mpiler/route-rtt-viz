/**
 * Enhanced Latency Data Updater - Data Generator
 * 
 * Provides functions to generate realistic simulated latency data
 * for both inter-region and intra-AZ scenarios. Used when real
 * IBM Cloud data cannot be scraped directly.
 * 
 * The simulation is based on geographic distribution, real-world
 * network topologies, and expected performance characteristics.
 */

const config = require('./config');
const utils = require('./utils');

/**
 * Generate simulated IBM Cloud inter-region latency data
 * 
 * This function creates realistic latency data based on geographic distances
 * and typical network performance. It's used when actual scraping is not possible.
 * 
 * @returns {Promise<Object>} Simulated latency data in IBM Cloud format
 */
async function generateInterRegionData() {
  utils.logger.info('Generating simulated IBM Cloud inter-region latency data...');
  
  // Define IBM Cloud regions with their display names
  const regions = [
    { code: 'us-south', displayName: 'Dallas' },
    { code: 'us-east', displayName: 'Washington DC' },
    { code: 'ca-tor', displayName: 'Toronto' },
    { code: 'br-sao', displayName: 'Sao Paulo' },
    { code: 'eu-gb', displayName: 'London' },
    { code: 'eu-de', displayName: 'Frankfurt' },
    { code: 'eu-es', displayName: 'Madrid' },
    { code: 'au-syd', displayName: 'Sydney' },
    { code: 'jp-tok', displayName: 'Tokyo' },
    { code: 'jp-osa', displayName: 'Osaka' },
    { code: 'ca-mon', displayName: 'Montreal' },
    { code: 'in-che', displayName: 'Chennai' }
  ];
  
  // Define approximate latencies between major regions
  // These are realistic values based on typical internet routing
  const baseLatencies = {
    // North America internal
    'Dallas-Washington DC': 25,
    'Dallas-Toronto': 35,
    'Washington DC-Toronto': 28,
    'Toronto-Montreal': 8,
    'Montreal-Washington DC': 32,
    
    // North America to South America
    'Dallas-Sao Paulo': 120,
    'Washington DC-Sao Paulo': 125,
    
    // North America to Europe
    'Dallas-London': 85,
    'Washington DC-London': 80,
    'Toronto-London': 90,
    'Dallas-Frankfurt': 90,
    'Washington DC-Frankfurt': 87,
    'Dallas-Madrid': 95,
    
    // Europe internal
    'London-Frankfurt': 15,
    'London-Madrid': 30,
    'Frankfurt-Madrid': 28,
    
    // Asia internal
    'Tokyo-Osaka': 9,
    'Tokyo-Chennai': 130,
    'Osaka-Chennai': 135,
    
    // Asia to Oceania
    'Tokyo-Sydney': 115,
    'Osaka-Sydney': 120,
    'Chennai-Sydney': 140,
    
    // Cross-regional long haul
    'London-Tokyo': 220,
    'Frankfurt-Tokyo': 230,
    'Dallas-Tokyo': 150,
    'Washington DC-Tokyo': 145,
    'London-Sydney': 260,
    'Frankfurt-Sydney': 270,
    'Dallas-Sydney': 180,
    'Sao Paulo-Sydney': 320,
    'Sao Paulo-Tokyo': 300
  };
  
  // Add small variations each time to simulate network changes
  // This makes the data more realistic and prevents stagnant updates
  const addVariations = (baseLatency) => {
    // Add random variation of ±5%
    const variationFactor = 0.95 + (Math.random() * 0.1);
    return Math.round(baseLatency * variationFactor);
  };
  
  // Create a varying version of the base latencies
  const variedLatencies = {};
  for (const [key, value] of Object.entries(baseLatencies)) {
    variedLatencies[key] = addVariations(value);
  }
  
  // Generate latency for all region pairs
  const regionsData = {};
  
  for (const sourceRegion of regions) {
    regionsData[sourceRegion.code] = {};
    
    for (const targetRegion of regions) {
      // Skip same region
      if (sourceRegion.code === targetRegion.code) continue;
      
      // Try to find direct latency from the base latencies
      const directKey = `${sourceRegion.displayName}-${targetRegion.displayName}`;
      const reverseKey = `${targetRegion.displayName}-${sourceRegion.displayName}`;
      
      if (variedLatencies[directKey]) {
        regionsData[sourceRegion.code][targetRegion.code] = variedLatencies[directKey];
      } else if (variedLatencies[reverseKey]) {
        regionsData[sourceRegion.code][targetRegion.code] = variedLatencies[reverseKey];
      } else {
        // If no direct latency is defined, estimate based on geographic distance
        // This is a simplified approach; real network latency depends on many factors
        
        // Generate a semi-random but consistent latency between 50 and 300ms
        // Hash the region pair to get a consistent value
        const hash = (sourceRegion.code + targetRegion.code).split('').reduce(
          (acc, char) => acc + char.charCodeAt(0), 0
        );
        
        // Base latency between 50 and 300ms
        const baseLatency = 50 + (hash % 250);
        
        // Add some randomness (±5%)
        const randomFactor = 0.95 + (Math.random() * 0.1);
        
        regionsData[sourceRegion.code][targetRegion.code] = Math.round(baseLatency * randomFactor);
      }
    }
  }
  
  utils.logger.info('Simulated inter-region latency data generated successfully');
  
  return {
    timestamp: new Date().toISOString(),
    regions: regionsData
  };
}

/**
 * Generate simulated IBM Cloud intra-AZ latency data
 * 
 * This function creates realistic intra-AZ (availability zone) latency data
 * based on typical data center performance. It's used when actual scraping
 * is not possible.
 * 
 * @returns {Promise<Object>} Simulated intra-AZ latency data
 */
async function generateIntraAzData() {
  utils.logger.info('Generating simulated intra-AZ latency data...');
  
  // Define regions and availability zones for IBM Cloud
  const regions = [
    { name: 'us-south', zones: ['us-south-1', 'us-south-2', 'us-south-3'], displayName: 'Dallas' },
    { name: 'us-east', zones: ['us-east-1', 'us-east-2', 'us-east-3'], displayName: 'Washington DC' },
    { name: 'ca-tor', zones: ['ca-tor-1', 'ca-tor-2', 'ca-tor-3'], displayName: 'Toronto' },
    { name: 'br-sao', zones: ['br-sao-1', 'br-sao-2', 'br-sao-3'], displayName: 'Sao Paulo' },
    { name: 'eu-gb', zones: ['eu-gb-1', 'eu-gb-2', 'eu-gb-3'], displayName: 'London' },
    { name: 'eu-de', zones: ['eu-de-1', 'eu-de-2', 'eu-de-3'], displayName: 'Frankfurt' },
    { name: 'eu-es', zones: ['eu-es-1', 'eu-es-2', 'eu-es-3'], displayName: 'Madrid' },
    { name: 'jp-tok', zones: ['jp-tok-1', 'jp-tok-2', 'jp-tok-3'], displayName: 'Tokyo' },
    { name: 'jp-osa', zones: ['jp-osa-1', 'jp-osa-2', 'jp-osa-3'], displayName: 'Osaka' },
    { name: 'au-syd', zones: ['au-syd-1', 'au-syd-2', 'au-syd-3'], displayName: 'Sydney' }
  ];
  
  // Define base latency patterns for different region types
  // These values simulate realistic intra-AZ latency based on region characteristics
  const regionLatencyProfiles = {
    'us-south': { min: 0.38, max: 0.85 },    // Dallas - Very optimized
    'us-east': { min: 0.42, max: 0.95 },     // Washington DC - Very optimized
    'ca-tor': { min: 0.45, max: 1.10 },      // Toronto
    'br-sao': { min: 0.65, max: 1.40 },      // Sao Paulo - Higher latency
    'eu-gb': { min: 0.40, max: 0.90 },       // London - Well optimized
    'eu-de': { min: 0.35, max: 0.80 },       // Frankfurt - Very optimized
    'eu-es': { min: 0.48, max: 1.20 },       // Madrid
    'jp-tok': { min: 0.40, max: 0.85 },      // Tokyo - Well optimized
    'jp-osa': { min: 0.50, max: 1.10 },      // Osaka
    'au-syd': { min: 0.55, max: 1.25 }       // Sydney
  };
  
  // Add small variations to simulate network changes over time
  const addVariations = (baseLatency) => {
    // Add random variation of ±3%
    const variationFactor = 0.97 + (Math.random() * 0.06);
    return parseFloat((baseLatency * variationFactor).toFixed(2));
  };
  
  // Generate latency data for each region
  const timestamp = new Date().toISOString();
  
  const rawData = {
    timestamp,
    regions: regions.map(region => {
      // Get the latency profile for this region (or use default values)
      const profile = regionLatencyProfiles[region.name] || { min: 0.5, max: 1.2 };
      
      // Generate latency data between zones in this region
      const zoneLatencies = [];
      
      // Create a consistent seed based on region name to ensure
      // repeatability even with "random" numbers
      const regionSeed = region.name.split('').reduce(
        (acc, char) => acc + char.charCodeAt(0), 0
      );
      
      for (let i = 0; i < region.zones.length; i++) {
        for (let j = i + 1; j < region.zones.length; j++) {
          // Create a seed for this specific zone pair
          const zonePairSeed = (i * 100 + j) + regionSeed;
          
          // Use the seed to generate a "random" but consistent latency
          const randomFactor = ((zonePairSeed % 100) / 100); // 0-1 value
          
          // Calculate latency within the profile range
          const latencyRange = profile.max - profile.min;
          const baseLatency = profile.min + (randomFactor * latencyRange);
          
          // Add some variation to simulate changes
          const latency = addVariations(baseLatency);
          
          zoneLatencies.push({
            sourceZone: region.zones[i],
            targetZone: region.zones[j],
            latency
          });
          
          // Also add the reverse direction with identical latency
          zoneLatencies.push({
            sourceZone: region.zones[j],
            targetZone: region.zones[i],
            latency
          });
        }
      }
      
      return {
        regionName: region.name,
        displayName: region.displayName,
        zones: region.zones,
        zoneLatencies
      };
    }),
  };
  
  // Generate HPC recommendations based on the generated data
  const regionStats = {};
  
  // Calculate statistics for each region
  for (const region of rawData.regions) {
    const latencies = region.zoneLatencies.map(zl => zl.latency);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    
    regionStats[region.regionName] = {
      displayName: region.displayName,
      avgLatency: avgLatency,
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      stdDeviation: Math.sqrt(
        latencies.map(l => Math.pow(l - avgLatency, 2))
                .reduce((a, b) => a + b, 0) / latencies.length
      )
    };
  }
  
  // Create recommendations based on the statistics
  const hpcRecommendations = [];
  
  // Sort regions by average latency (lowest first)
  const regionsByAvgLatency = Object.keys(regionStats)
    .sort((a, b) => regionStats[a].avgLatency - regionStats[b].avgLatency);
  
  // Tightly Coupled HPC recommendation (lowest latency)
  const tightlyCoupledRegion = regionsByAvgLatency[0];
  const tightlyCoupledStats = regionStats[tightlyCoupledRegion];
  
  // Find the lowest latency zone pair in this region
  const tightlyCoupledRegionData = rawData.regions
    .find(r => r.regionName === tightlyCoupledRegion);
  
  // Sort zone pairs by latency
  const sortedZonePairs = [...tightlyCoupledRegionData.zoneLatencies]
    .sort((a, b) => a.latency - b.latency);
  
  // Use the lowest latency pair
  const lowestLatencyPair = sortedZonePairs[0];
  
  hpcRecommendations.push({
    workloadType: "Tightly Coupled HPC",
    recommendedRegion: tightlyCoupledRegion,
    recommendedZones: [lowestLatencyPair.sourceZone, lowestLatencyPair.targetZone],
    reason: `Lowest inter-zone latency (avg ${tightlyCoupledStats.avgLatency.toFixed(2)}ms)`
  });
  
  // ML Training recommendation (consistent performance)
  // Sort regions by standard deviation (lowest first)
  const regionsByStdDev = Object.keys(regionStats)
    .sort((a, b) => regionStats[a].stdDeviation - regionStats[b].stdDeviation);
  
  const mlTrainingRegion = regionsByStdDev[0];
  const mlTrainingStats = regionStats[mlTrainingRegion];
  
  hpcRecommendations.push({
    workloadType: "ML Training",
    recommendedRegion: mlTrainingRegion,
    recommendedZones: rawData.regions
      .find(r => r.regionName === mlTrainingRegion).zones.slice(0, 2),
    reason: `Consistent performance (stdDev ${mlTrainingStats.stdDeviation.toFixed(2)}ms)`
  });
  
  // Data Analytics recommendation (balanced performance)
  // Find a region with good balance of latency and consistency
  const dataAnalyticsScore = {};
  
  for (const region in regionStats) {
    // Calculate a score based on both latency and consistency
    // Lower is better
    dataAnalyticsScore[region] = regionStats[region].avgLatency * 0.7 + 
                                regionStats[region].stdDeviation * 0.3;
  }
  
  // Sort regions by score
  const regionsByScore = Object.keys(dataAnalyticsScore)
    .sort((a, b) => dataAnalyticsScore[a] - dataAnalyticsScore[b])
    .filter(r => r !== tightlyCoupledRegion && r !== mlTrainingRegion); // Avoid duplicates
  
  const dataAnalyticsRegion = regionsByScore[0];
  const dataAnalyticsStats = regionStats[dataAnalyticsRegion];
  
  hpcRecommendations.push({
    workloadType: "Data Analytics",
    recommendedRegion: dataAnalyticsRegion,
    recommendedZones: rawData.regions
      .find(r => r.regionName === dataAnalyticsRegion).zones,
    reason: `Balanced latency and consistency (avg ${dataAnalyticsStats.avgLatency.toFixed(2)}ms)`
  });
  
  // Add recommendations to the data
  rawData.hpcRecommendations = hpcRecommendations;
  
  // Create visualization-friendly format
  const vizData = createVisualizationFormat(rawData);
  
  // Generate HPC analysis
  const hpcAnalysis = generateHpcAnalysis(rawData);
  
  // Combine all data into the final structure
  const finalData = {
    timestamp,
    rawData,
    vizData,
    hpcAnalysis
  };
  
  utils.logger.info('Simulated intra-AZ latency data generated successfully');
  
  return finalData;
}

/**
 * Create a visualization-friendly format of the intra-AZ latency data
 */
function createVisualizationFormat(intraAzData) {
  // Convert the data to a format suitable for visualization
  const vizData = {
    timestamp: intraAzData.timestamp,
    regions: intraAzData.regions.map(region => {
      // Create node-link data for network graphs
      const nodes = region.zones.map(zone => ({
        id: zone,
        label: zone.split('-').pop(), // Get just the zone number
        group: region.name
      }));
      
      const links = region.zoneLatencies.map(zl => ({
        source: zl.sourceZone,
        target: zl.targetZone,
        value: zl.latency,
        label: `${zl.latency}ms`
      }));
      
      // Calculate min, max, avg latencies
      const latencies = region.zoneLatencies.map(zl => zl.latency);
      const stats = {
        min: Math.min(...latencies),
        max: Math.max(...latencies),
        avg: latencies.reduce((a, b) => a + b, 0) / latencies.length
      };
      
      return {
        regionName: region.name,
        displayName: region.displayName,
        stats: stats,
        networkData: {
          nodes: nodes,
          links: links
        }
      };
    }),
    hpcRecommendations: intraAzData.hpcRecommendations
  };
  
  return vizData;
}

/**
 * Generate HPC analysis and recommendations based on intra-AZ data
 */
function generateHpcAnalysis(intraAzData) {
  // Find regions with the lowest intra-AZ latency
  const regionStats = intraAzData.regions.map(region => {
    const latencies = region.zoneLatencies.map(zl => zl.latency);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    
    return {
      regionName: region.name,
      displayName: region.displayName,
      avgLatency: avgLatency,
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      stdDeviation: Math.sqrt(
        latencies.map(l => Math.pow(l - avgLatency, 2))
                .reduce((a, b) => a + b, 0) / latencies.length
      )
    };
  });
  
  // Sort regions by average latency (lowest first)
  regionStats.sort((a, b) => a.avgLatency - b.avgLatency);
  
  // Generate recommendations
  const recommendations = [
    {
      workloadType: "Tightly Coupled HPC",
      recommendations: regionStats.slice(0, 3).map(stats => ({
        region: stats.regionName,
        displayName: stats.displayName,
        reason: `Low inter-zone latency (avg ${stats.avgLatency.toFixed(2)}ms)`,
        latencyStats: {
          avg: stats.avgLatency,
          min: stats.minLatency,
          max: stats.maxLatency,
          stdDev: stats.stdDeviation
        }
      }))
    },
    {
      workloadType: "Data Analytics",
      recommendations: regionStats.map(stats => ({
        region: stats.regionName,
        displayName: stats.displayName,
        reason: `Predictable latency (stdDev ${stats.stdDeviation.toFixed(2)}ms)`,
        latencyStats: {
          avg: stats.avgLatency,
          min: stats.minLatency,
          max: stats.maxLatency,
          stdDev: stats.stdDeviation
        }
      })).sort((a, b) => a.latencyStats.stdDev - b.latencyStats.stdDev).slice(0, 3)
    },
    {
      workloadType: "Distributed Computing",
      recommendations: regionStats.map(stats => ({
        region: stats.regionName,
        displayName: stats.displayName,
        reason: `Consistent performance (max latency ${stats.maxLatency.toFixed(2)}ms)`,
        latencyStats: {
          avg: stats.avgLatency,
          min: stats.minLatency,
          max: stats.maxLatency,
          stdDev: stats.stdDeviation
        }
      })).sort((a, b) => a.latencyStats.max - b.latencyStats.max).slice(0, 3)
    }
  ];
  
  return recommendations;
}

module.exports = {
  generateInterRegionData,
  generateIntraAzData
};
