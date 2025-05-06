# Route Radar Data Template

This directory contains a backup of the original latency data files used by Route Radar. These files serve as a template that can be restored at any time using the provided utility.

## Files Included

- `latency-data.json` - Primary latency data between regions
- `backup-latency-data.json` - Backup copy of the primary latency data
- `required-connections.json` - Essential connections that must be maintained
- `fallback-connections.json` - Fallback data for when primary connections are unavailable
- `fallback-required-connections.json` - Fallback data for required connections
- `intra-az-latency-data.json` - Latency data between availability zones within regions

## Original Data Sources

The original dataset includes latency data from multiple sources, including:
- AWS regions
- Azure regions
- Google Cloud regions
- IBM Cloud regions
- Manual measurements and estimations

This backup preserves connections to regions that may not exist in some cloud providers, such as Seattle, which is not an IBM Cloud region but is included in the original dataset.

## Usage

To restore this data, use the `restore-template-data.js` utility in the tools directory:

```bash
cd /Users/c0mpiler/sandbox/c0mpiler.dev/novactl-platctl/ic-lat-calc/
node tools/restore-template-data.js
```

Or use the npm script:

```bash
npm run restore-data
```

## Data Format

The latency data is stored in the following formats:

### Inter-Region Latency

```json
{
  "connections": [
    {
      "source": "Region1",
      "target": "Region2",
      "rtt": 42
    }
  ]
}
```

### Intra-AZ Latency

```json
{
  "timestamp": "2025-05-05T20:03:06.821Z",
  "rawData": { ... },
  "vizData": { ... },
  "hpcAnalysis": [ ... ]
}
```

## Last Updated

May 5, 2025
