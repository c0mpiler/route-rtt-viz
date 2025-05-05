# Getting Started with Route Radar

## Prerequisites

- Node.js 16.0+ and npm 7.0+
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Git

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/c0mpiler/route-rtt-viz.git
   cd route-rtt-viz
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:3000/route-radar/`

## Project Structure

```
/route-rtt-viz/
├── public/              # Static files and data
│   ├── latency-data.json
│   ├── coordinates-data.json
│   └── ...
├── src/
│   ├── components/      # React components
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   ├── workers/         # Web Workers
│   └── types/           # TypeScript definitions
├── tools/               # Maintenance utilities
└── docs/                # Documentation
```

## Basic Usage

### Visualizing Network Paths

1. Select source and target regions from the dropdowns
2. Routes are automatically calculated and displayed
3. Switch between visualization modes:
   - **Paths**: Detailed path information
   - **Chart**: Visual latency comparison
   - **Network Map**: Interactive topology graph
   - **World Map**: Geographic visualization

### Importing Data

1. Prepare your RTT data in JSON or CSV format
2. Click the "Import Data" button in the header
3. Select and upload your file
4. Data is automatically validated and applied

### Exporting Results

1. Navigate to the Export tab
2. Choose export format (CSV, JSON, PNG, PDF)
3. Click Export button
4. File downloads automatically

## Configuration

### Environment Variables

Create a `.env` file for custom configuration:

```env
VITE_PUBLIC_URL=/route-radar/
VITE_API_ENDPOINT=https://api.example.com
```

### Data File Management

The application loads data from the `/public` directory. Key files:

- `latency-data.json`: Network latency data
- `coordinates-data.json`: Geographic coordinates
- `required-connections.json`: Essential network connections

## Development

### Running Tests

```bash
npm test                 # Run all tests
npm run test:watch      # Watch mode
```

### Building for Production

```bash
npm run build           # Build for production
npm run preview         # Preview build locally
```

### Linting

```bash
npm run lint            # Check code style
npm run lint:fix        # Auto-fix issues
```

## Troubleshooting

### Common Issues

1. **Data not loading**: Check console for errors, verify JSON format
2. **Slow performance**: Enable virtual scrolling for large datasets
3. **Visualization errors**: Clear cache and reload

### Browser Compatibility

Minimum versions supported:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Next Steps

1. Read the [Technical Architecture](TECHNICAL-ARCHITECTURE.md)
2. Explore the [API documentation](API.md)
3. Check [Contributing guidelines](CONTRIBUTING.md)
4. Review example implementations

## Support

For help or questions:
- Open an issue on GitHub
- Email: c0mpiler@ins8s.dev
- Review the [FAQ](../README.md#faq) section

Good Luck optimizing! 🚀
