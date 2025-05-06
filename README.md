# Route Radar v0.1.0 (Beta)

> A powerful network latency visualization tool for optimizing global network paths

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.1.0--beta-green.svg)](CHANGELOG.md)

![Route Radar Screenshot](/docs/app-fullpage-screenshot.png)

## Overview

Route Radar transforms complex network latency data into clear, actionable visualizations. Originally designed for IBM Cloud regions, it provides a universal solution for analyzing any network topology. Upload your RTT data to gain insights across AWS, Azure, GCP, or any custom infrastructure.

**Key Benefits:**
- 🌐 Universal network visualization
- 📊 Multiple visualization modes
- 🚀 Advanced path analytics
- ⚡ Performance optimized
- 📱 Responsive design
- 💾 Flexible data import/export

## Quick Start

### One-Line Setup
```bash
# Install dependencies and start development server
npm install && npm run dev
```

Or use the provided script:
```bash
chmod +x run-dev.sh
./run-dev.sh
```

Access at: `http://localhost:3000/route-rtt-viz/`

## Core Capabilities

### Network Visualization
- Interactive network graphs with geographic positioning
- Animated path traversal visualization
- Color-coded latency indicators
- Multiple visualization modes for different insights

### Advanced Analytics
- Shortest path calculation using Dijkstra's algorithm
- Longest path discovery for worst-case scenarios
- Alternative route finding for redundancy planning
- Hop-by-hop latency analysis

### Data Management
- Support for JSON and CSV data formats
- Real-time data import and validation
- Comprehensive export options
- Backup and fallback mechanisms
- Automated IBM Cloud latency data scraping tools

### Performance Engineering
- Virtual scrolling for large datasets (100+ routes)
- Web Workers for non-blocking calculations
- Multi-tier caching system
- IndexedDB persistence

## Data Format

### JSON Structure
```json
{
  "connections": [
    {
      "source": "us-east-1",
      "target": "eu-west-1",
      "rtt": 85.5
    }
  ]
}
```

### CSV Format
```csv
source,target,rtt
us-east-1,eu-west-1,85.5
```

## Technical Stack

- **Frontend**: React 18, TypeScript 5.3, TailwindCSS 3.3
- **Visualization**: D3.js 7.8, Chart.js, Three.js
- **Performance**: Web Workers, IndexedDB, Virtual Scrolling
- **Build**: Vite 5.0, PostCSS

## Architecture Highlights

### Network Graph Engine
- Efficient adjacency list representation
- Bidirectional consistency validation
- Hub node detection
- Cycle prevention

### Visualization Pipeline
- SVG rendering for smooth interactions
- Force simulation optimization
- Geographic projection mapping
- Animated particle systems

### Caching System
- In-memory path caching
- IndexedDB persistence
- LRU eviction policy
- Cache statistics monitoring

## Documentation

- [Technical Architecture](docs/TECHNICAL-ARCHITECTURE.md) - Deep dive into system design
- [RTT Data Guide](docs/RTT-UPDATE-GUIDE.md) - Data management utilities
- [IBM Cloud Scraper](tools/scraper/README.md) - Tools for scraping IBM Cloud latency data
- [Contributing](docs/CONTRIBUTING.md) - Development guidelines
- [Changelog](docs/CHANGELOG.md) - Release history

## Development

### Project Structure
```
src/
├── components/    # UI components
├── hooks/         # Custom React hooks
├── utils/         # Utility functions
├── workers/       # Web Workers
└── types/         # TypeScript definitions
```

### Build Commands
```bash
npm run dev                  # Development server
npm run build                # Production build
npm run preview              # Preview build
npm run deploy               # Deploy to GitHub Pages
npm run update-ibm-latency   # Update IBM Cloud inter-region latency data
npm run update-intra-az      # Update IBM Cloud intra-AZ latency data
npm run update-ibm-all       # Update all IBM Cloud latency data
```

## Production Deployment

Route Radar is deployed at: [https://c0mpiler.github.io/route-rtt-viz](https://c0mpiler.github.io/route-rtt-viz)

## Support

For issues, feature requests, or contributions, please visit our [GitHub Issues](https://github.com/c0mpiler/route-rtt-viz/issues) page.

## License

[MIT](LICENSE) © 2025 Harsha

---
