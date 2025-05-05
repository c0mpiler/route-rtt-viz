# IBM Cloud Latency Pathfinder - RTT Update Guide

This document explains how to update Round-Trip Time (RTT) values in the IBM Cloud Latency Pathfinder application. All the data used by the application is now stored in JSON files without any hard-coded values in the source code.

## Data Files Structure

All data files are located in the `/public` directory:

1. **Primary Data Files:**
   - `latency-data.json` - Main data source for RTT values between regions
   - `coordinates-data.json` - Geographic coordinates for each region
   - `required-connections.json` - Essential connections that must always exist
   - `distant-regions.json` - Regions used for finding longest paths
   - `hub-regions.json` - Default hub regions for network connectivity

2. **Fallback Data Files:**
   - `backup-latency-data.json` - Backup of the main latency data
   - `fallback-connections.json` - Fallback connections used if main file fails
   - `fallback-required-connections.json` - Fallback required connections
   - `fallback-coordinates.json` - Fallback geographic coordinates
   - `fallback-distant-regions.json` - Fallback distant regions
   - `fallback-hub-regions.json` - Fallback hub regions for network connectivity

## RTT Update Utility

We've created a Node.js utility to make updating RTT values easier and ensure all files stay in sync. The utility is located in the `/tools` directory.

### Setting Up the Utility

1. Navigate to the tools directory:
   ```bash
   cd tools
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Using the Utility

#### Update a Single RTT Value

To update the RTT value between two regions:

```bash
node update-rtt.js "Source Region" "Target Region" RTT_VALUE
```

Example:
```bash
node update-rtt.js "New York" "London" 75
```

This will:
- Update the RTT between New York and London to 75ms
- Update both directions (New York→London and London→New York)
- Update any fallback files if the connection exists there
- Create a backup of the main latency data

#### Import Multiple RTT Values from CSV

You can update multiple RTT values at once by importing a CSV file:

```bash
node update-rtt.js --import path/to/your-file.csv
```

The CSV file should have the following format:
```
source,target,rtt
"New York","London",75
"Tokyo","Singapore",68
"Sydney","Auckland",25
```

#### Verify Data Consistency

To check that all RTT files are in sync:

```bash
node update-rtt.js --verify
```

This will check:
- latency-data.json matches backup-latency-data.json
- required-connections.json is consistent with latency-data.json
- fallback files are consistent with their primary counterparts
- All connections have consistent bidirectional RTT values

### Adding New Regions

If you want to add a completely new region:

1. Add the region's coordinates to `coordinates-data.json` under the appropriate continent
2. Add any necessary connections to the region in `latency-data.json`
3. If the region is a major hub, consider adding some connections to `required-connections.json`
4. Update the fallback files as well for consistency

## JSON File Formats

### latency-data.json

```json
{
  "connections": [
    { "source": "Region1", "target": "Region2", "rtt": 75 },
    { "source": "Region2", "target": "Region1", "rtt": 75 },
    ...
  ]
}
```

### coordinates-data.json

```json
{
  "regions": {
    "North America": {
      "New York": [-74.0060, 40.7128],
      "Chicago": [-87.6298, 41.8781],
      ...
    },
    "Europe": {
      "London": [-0.1278, 51.5074],
      ...
    },
    ...
  }
}
```

### required-connections.json

```json
{
  "connections": [
    { "source": "Region1", "target": "Region2", "latency": 75 },
    ...
  ]
}
```

### distant-regions.json

```json
{
  "regions": [
    "London", "Paris", "Mumbai", "Singapore", ...
  ],
  "specialCombinations": [
    ["London", "Mumbai", "Singapore"],
    ["Paris", "Mumbai", "Hong Kong"],
    ...
  ]
}
```

### hub-regions.json

```json
{
  "regions": [
    "Region1", "Region2", "Region3", "Region4", "Region5"
  ]
}
```

## Troubleshooting

If you encounter issues:

1. Run the verify command to check for inconsistencies:
   ```bash
   node update-rtt.js --verify
   ```

2. Fix any inconsistencies manually or by using the update utility

3. Make sure all JSON files are valid JSON format

4. If changes aren't taking effect, try clearing your browser cache or rebuilding the application

If all else fails, you can revert to the backup files or use the fallback files as a reference.
