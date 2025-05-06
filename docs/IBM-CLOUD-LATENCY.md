# IBM Cloud Latency Data Integration

This guide explains how to use the IBM Cloud latency data scraping tools and integrate the resulting data into Route Radar.

## Overview

Route Radar now includes tools to automatically scrape and integrate latency data from IBM Cloud:

1. **Inter-Region Latency** - Network latency between IBM Cloud regions (e.g., Dallas to Washington DC)
2. **Intra-AZ Latency** - Network latency between availability zones within a region (e.g., us-south-1 to us-south-2)

These tools are designed to run in development mode only and provide developers with up-to-date latency information for visualization and analysis.

## Quick Start

Update all IBM Cloud latency data with a single command:

```bash
npm run update-ibm-all
```

Or run a dry-run to see what would be updated without making changes:

```bash
npm run update-ibm-all:dry
```

## Tools

### IBM Cloud Inter-Region Latency Scraper

This tool scrapes the latest inter-region latency data from IBM Cloud and updates the project's latency data files.

```bash
npm run update-ibm-latency       # Live update
npm run update-ibm-latency:dry   # Dry run
```

The scraper:
1. Fetches data from IBM Cloud's network latency dashboard
2. Converts it to Route Radar's format
3. Updates the main latency data file (`latency-data.json`)
4. Creates a backup copy (`backup-latency-data.json`)
5. Updates related files like required connections

### IBM Cloud Intra-AZ Latency Scraper

This tool scrapes intra-AZ (availability zone) latency data and provides visualization and analysis tools for HPC planning.

```bash
npm run update-intra-az          # Live update
npm run update-intra-az:dry      # Dry run
```

The resulting data includes:
- Latency between availability zones within each region
- HPC planning recommendations based on latency patterns
- Visualization-ready data structures

## Visualization

The Intra-AZ latency data can be visualized using the `IntraAzLatencyVisualizer` component:

```tsx
import { IntraAzLatencyVisualizer } from '@components/viz/IntraAzLatencyVisualizer';

// In your component
<IntraAzLatencyVisualizer />
```

This component provides:
- Interactive network graphs showing zone-to-zone latency
- Statistical analysis of latency patterns
- HPC planning recommendations for different workload types

## HPC Planning

The Intra-AZ latency data is particularly valuable for HPC (High-Performance Computing) planning. The tools automatically generate recommendations for:

1. **Tightly Coupled HPC** - For workloads requiring frequent inter-node communication
2. **Data Analytics** - For workloads that prioritize consistent performance
3. **Distributed Computing** - For workloads that need lower maximum latency thresholds

These recommendations help infrastructure planners select the optimal regions and availability zones for specific HPC workloads.

## Technical Details

### Data Format

The inter-region latency data format:

```json
{
  "connections": [
    {
      "source": "Dallas",
      "target": "Washington DC",
      "rtt": 25
    }
  ]
}
```

The intra-AZ latency data format:

```json
{
  "timestamp": "2025-05-04T12:34:56Z",
  "rawData": {
    "regions": [
      {
        "regionName": "us-south",
        "displayName": "Dallas",
        "zones": ["us-south-1", "us-south-2", "us-south-3"],
        "zoneLatencies": [
          {
            "sourceZone": "us-south-1",
            "targetZone": "us-south-2",
            "latency": 0.76
          }
        ]
      }
    ],
    "hpcRecommendations": [...]
  },
  "vizData": {...},
  "hpcAnalysis": [...]
}
```

### Implementation Notes

- The scrapers use Puppeteer for web scraping
- Both tools run in development mode only (for security)
- The initial implementation uses simulated data since direct API access is not available
- The tools can be run manually or integrated into CI/CD pipelines

## Advanced Usage

### Custom Output File

You can specify a custom output file for the intra-AZ latency data:

```bash
node tools/scraper/ibm-cloud-intra-az-scraper.js --output=custom-path.json
```

### Force Execution

In special cases, you may need to force execution even in production:

```bash
node tools/scraper/ibm-cloud-latency-scraper.js --force
```

**Warning:** Use the `--force` flag with caution!

## Limitations

- The current implementation uses simulated data since direct API access to IBM Cloud's latency dashboard is not available
- The tools are designed for development use only and should not be used in production without care
- IBM Cloud's latency data may change over time, requiring updates to the scraping logic

## Related Documentation

- [IBM Cloud Network Latency Dashboard](https://cloud.ibm.com/docs/vpc?topic=vpc-network-latency-dashboard)
- [IBM Cloud Scraper Tools README](../tools/scraper/README.md)
- [RTT Data Update Guide](RTT-UPDATE-GUIDE.md)

## Future Improvements

- Integration with IBM Cloud API if/when it becomes available
- Automated scheduling of data updates
- More sophisticated HPC planning recommendations
- Historical latency trend analysis
