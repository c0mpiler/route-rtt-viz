/**
 * Simple test for the enhanced updater
 */
const utils = require('./utils');
const { generateInterRegionData, generateIntraAzData } = require('./data-generator');

// Test function
async function test() {
  try {
    console.log('Testing the enhanced updater utilities...');
    
    // Test data generation
    console.log('\n1. Testing inter-region data generation:');
    const interRegionData = await generateInterRegionData();
    console.log(`Generated data with ${Object.keys(interRegionData.regions).length} regions`);
    
    // Convert to application format
    const appFormat = utils.convertScrapedDataToApplicationFormat(interRegionData);
    console.log(`Converted to application format with ${appFormat.connections.length} connections`);
    
    // Test validation
    console.log('\n2. Testing data validation:');
    const validationResults = utils.validateLatencyData(appFormat);
    console.log('Validation result:', validationResults.isValid ? 'PASSED' : 'FAILED');
    console.log('Stats:', validationResults.stats);
    
    // Test intra-AZ data generation
    console.log('\n3. Testing intra-AZ data generation:');
    const intraAzData = await generateIntraAzData();
    console.log(`Generated intra-AZ data with ${intraAzData.rawData.regions.length} regions`);
    console.log(`Each region has ~${intraAzData.rawData.regions[0].zoneLatencies.length} zone-to-zone latency entries`);
    console.log(`HPC recommendations count: ${intraAzData.rawData.hpcRecommendations.length}`);
    
    // Test graph connectivity function
    console.log('\n4. Testing graph connectivity function:');
    
    // Create a test graph with some disconnected regions
    const disconnectedGraph = {
      connections: [
        { source: 'A', target: 'B', rtt: 10 },
        { source: 'B', target: 'A', rtt: 10 },
        { source: 'B', target: 'C', rtt: 15 },
        { source: 'C', target: 'B', rtt: 15 },
        // D and E are disconnected from A-B-C
        { source: 'D', target: 'E', rtt: 20 },
        { source: 'E', target: 'D', rtt: 20 },
      ]
    };
    
    // Connect the graph
    const connectedGraph = utils.ensureConnectedGraph(disconnectedGraph);
    
    // Check if all regions are now connected
    console.log(`Original graph had ${disconnectedGraph.connections.length} connections`);
    console.log(`Connected graph has ${connectedGraph.connections.length} connections`);
    
    // Test regions that should now be connected
    const hasConnection = (graph, source, target) => {
      return graph.connections.some(conn => 
        (conn.source === source && conn.target === target) || 
        (conn.source === target && conn.target === source)
      );
    };
    
    console.log(`Connection A->D exists: ${hasConnection(connectedGraph, 'A', 'D')}`);
    console.log(`Connection C->E exists: ${hasConnection(connectedGraph, 'C', 'E')}`);
    
    // Test anomaly detection
    console.log('\n5. Testing anomaly detection:');
    const testData = {
      connections: [
        { source: 'A', target: 'B', rtt: 10 },
        { source: 'B', target: 'C', rtt: 15 },
        { source: 'C', target: 'A', rtt: 0.5 }, // Anomalous low value
        { source: 'D', target: 'A', rtt: 600 }, // Anomalous high value
        { source: 'E', target: 'A', rtt: 30 },
      ]
    };
    
    const anomalies = utils.detectAnomalies(testData);
    console.log(`Detected ${anomalies.length} anomalies:`);
    anomalies.forEach((anomaly, index) => {
      console.log(`  ${index + 1}. [${anomaly.type}] ${anomaly.message}`);
    });
    
    // Test comparison
    console.log('\n6. Testing data comparison:');
    const oldData = {
      connections: [
        { source: 'A', target: 'B', rtt: 10 },
        { source: 'B', target: 'C', rtt: 15 },
        { source: 'C', target: 'A', rtt: 20 },
        { source: 'D', target: 'A', rtt: 25 },
      ]
    };
    
    const newData = {
      connections: [
        { source: 'A', target: 'B', rtt: 11 }, // Changed
        { source: 'B', target: 'C', rtt: 15 }, // Same
        { source: 'C', target: 'A', rtt: 18 }, // Changed
        { source: 'E', target: 'A', rtt: 30 }, // Added
        // D to A removed
      ]
    };
    
    const comparisonResults = utils.compareLatencyData(oldData, newData);
    console.log('Comparison results:');
    console.log(`  Added connections: ${comparisonResults.changes.addedConnections.length}`);
    console.log(`  Removed connections: ${comparisonResults.changes.removedConnections.length}`);
    console.log(`  Changed connections: ${comparisonResults.changes.changedConnections.length}`);
    console.log(`  Added regions: ${comparisonResults.changes.addedRegions.length}`);
    console.log(`  Removed regions: ${comparisonResults.changes.removedRegions.length}`);
    
    // Test merging
    console.log('\n7. Testing data merging:');
    const mergeResults = utils.mergeLatencyData(oldData, newData);
    console.log(`Merged data has ${mergeResults.data.connections.length} connections`);
    console.log(`Changes: Added ${mergeResults.changes.added}, Updated ${mergeResults.changes.updated}, Unchanged ${mergeResults.changes.unchanged}`);
    
    console.log('\nAll tests completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
test();
