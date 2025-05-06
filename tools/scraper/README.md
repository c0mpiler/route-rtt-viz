# IBM Cloud Latency Scraper Tools

These tools are designed to scrape latency data from IBM Cloud and update the Route Radar datasets. They are meant to be used in development mode only and provide up-to-date inter-region and intra-AZ latency information.

## Tools Included

1. **IBM Cloud Latency Scraper** (`ibm-cloud-latency-scraper.js`): Scrapes inter-region latency data from IBM Cloud and updates the project's latency data files.

2. **IBM Cloud Intra-AZ Scraper** (`ibm-cloud-intra-az-scraper.js`): Scrapes intra-AZ (availability zone) latency data from IBM Cloud and provides visualization and analysis tools for HPC planning.

## Requirements

- Node.js 16.0+
- npm 7.0+
- Puppeteer (for web scraping)
- CSV Parser (for parsing CSV data)

## Installation

The tools can be installed locally in the scraper directory:

```bash
cd tools/scraper
npm install
```

Or can be run directly from the project root using the provided npm scripts.

## Usage

From the project root directory:

```bash
# Update inter-region latency data
npm run update-ibm-latency

# Update inter-region latency data (dry run - doesn't modify files)
npm run update-ibm-latency:dry

# Update intra-AZ latency data 
npm run update-intra-az

# Update intra-AZ latency data (dry run - doesn't modify files)
npm run update-intra-az:dry
```

From the scraper directory:

```bash
# Update inter-region latency data
node ibm-cloud-latency-scraper.js

# Update inter-region latency data (dry run)
node ibm-cloud-latency-scraper.js --dry-run

# Update intra-AZ latency data
node ibm-cloud-intra-az-scraper.js

# Update intra-AZ latency data (dry run)
node ibm-cloud-intra-az-scraper.js --dry-run
```

## Options

### IBM Cloud Latency Scraper

- `--dry-run`: Don't actually update files, just print what would be updated
- `--force`: Force execution even if not in development mode (USE WITH CAUTION)
- `--help`: Display usage information

### IBM Cloud Intra-AZ Scraper

- `--dry-run`: Don't actually update files, just print what would be updated
- `--force`: Force execution even if not in development mode (USE WITH CAUTION)
- `--output=<file.json>`: Specify an output file for the intra-AZ latency data
- `--help`: Display usage information

## Data Format

### Inter-Region Latency Data

The inter-region latency data is stored in the following format:

```json
{
  "connections": [
    {
      "source": "Region1",
      "target": "Region2",
      "rtt": 42
    },
    ...
  ]
}
```

### Intra-AZ Latency Data

The intra-AZ latency data is stored in the following format:

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
          },
          ...
        ]
      },
      ...
    ],
    "hpcRecommendations": [
      {
        "workloadType": "Tightly Coupled HPC",
        "recommendedRegion": "us-south",
        "recommendedZones": ["us-south-1", "us-south-2"],
        "reason": "Lowest inter-zone latency (avg 0.68ms)"
      },
      ...
    ]
  },
  "vizData": { ... },
  "hpcAnalysis": { ... }
}
```

## Visualization

A visualization component for the intra-AZ latency data is available in the project:

```tsx
import { IntraAzLatencyVisualizer } from '@components/viz/IntraAzLatencyVisualizer';

// In your component
<IntraAzLatencyVisualizer />
```

This component visualizes the intra-AZ latency data and provides HPC planning recommendations based on the data.

## Safety and Security

These tools are intended for development use only and will refuse to run in production mode unless explicitly forced. This is to prevent accidental or unauthorized modification of production data.

## Notes

- The initial implementation uses simulated data since direct API access to IBM Cloud's latency dashboard is not available. A future implementation could use more direct methods if IBM provides an API.
- The intra-AZ latency visualizer provides valuable insights for HPC planning, helping to determine the best regions and zones for different types of HPC workloads.
- Regular updates of the latency data are recommended to ensure accuracy.
