# Contributing to Route Radar

We welcome contributions to Route Radar! This guide will help you get started.

## Getting Started

1. Fork the repository
2. Clone your fork:
```bash
git clone https://github.com/your-username/route-rtt-viz.git
```
3. Install dependencies:
```bash
npm install
```
4. Run the development server:
```bash
npm run dev
```

## Development Process

### Branch Naming
- `feature/`: New features (e.g., `feature/add-export-options`)
- `fix/`: Bug fixes (e.g., `fix/network-graph-rendering`)
- `docs/`: Documentation updates
- `perf/`: Performance improvements

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

### Testing

Run tests before submitting PRs:

```bash
# Run tests
npm test

# Watch mode for development
npm run test:watch
```

## Pull Request Process

1. **Update the README.md** with details of changes if needed
2. **Update CHANGELOG.md** following the existing format
3. **Ensure all tests pass**
4. **Include screenshots** for UI changes
5. **Write clear commit messages**:
   ```
   feat: add CSV export feature
   
   - Implement CSV export functionality
   - Add unit tests for export utility
   - Update documentation
   ```

## Code Standards

### TypeScript
- Use strict typing
- Prefer interfaces over types for object shapes
- Document complex types with JSDoc

### React
- Use functional components with hooks
- Follow the single responsibility principle
- Implement proper error boundaries
- Use `useCallback` and `useMemo` for performance

### Performance
- Implement virtual scrolling for large lists
- Use Web Workers for intensive calculations
- Optimize re-renders with React.memo

## Project Structure

```
src/
├── components/       # React components
├── hooks/           # Custom React hooks
├── utils/           # Utility functions
├── workers/         # Web Workers
├── types/           # TypeScript definitions
└── styles/          # Styling
```

## Testing Guidelines

- Unit tests for utilities and hooks
- Component tests for UI behavior
- Integration tests for data flow
- Performance benchmarks for critical paths

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create release notes
4. Tag the release

## Need Help?

- Open an issue for bugs or questions
- Join our discussions for feature ideas
- Contact the maintainer: c0mpiler@ins8s.dev

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Route Radar! 🚀