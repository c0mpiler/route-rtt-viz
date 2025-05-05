import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on current mode
  const env = loadEnv(mode, process.cwd(), '');
  
  // Check if this is development mode
  const isDev = mode === 'development';
  
  return {
    plugins: [
      react(),
      visualizer({
        filename: "./stats.html",
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
    ],
    base: isDev ? "/" : "/route-radar/", // Important for GitHub Pages deployment
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@utils": path.resolve(__dirname, "./src/utils"),
        "@hooks": path.resolve(__dirname, "./src/hooks"),
        "@types": path.resolve(__dirname, "./src/types"),
        "@state": path.resolve(__dirname, "./src/state"),
        "@workers": path.resolve(__dirname, "./src/workers"),
        "@context": path.resolve(__dirname, "./src/context"),
      },
    },
    build: {
      // Optimization settings for production
      target: "es2018", // Ensure compatibility with most browsers
      minify: "terser",
      terserOptions: {
        compress: {
          // V8 optimization hints
          passes: 2,
          ecma: 2018,
          drop_console: process.env.NODE_ENV === 'production', // Only drop console in production
          drop_debugger: process.env.NODE_ENV === 'production',
          pure_funcs: process.env.NODE_ENV === 'production' ? ['console.debug'] : [],
        },
        mangle: {
          safari10: true, // Ensure Safari compatibility
        },
        format: {
          comments: false, // Remove comments in production
        },
      },
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Generate more optimized chunks
            if (id.includes('node_modules')) {
              if (id.includes('react')) {
                return 'vendor-react';
              }
              if (id.includes('d3')) {
                return 'vendor-d3';
              }
              if (id.includes('chart.js')) {
                return 'vendor-chart';
              }
              if (id.includes('three')) {
                return 'vendor-three';
              }
              return 'vendor'; // all other packages
            }
            
            // Split app code
            if (id.includes('/components/')) {
              return 'components';
            }
            if (id.includes('/utils/')) {
              return 'utils';
            }
            if (id.includes('/hooks/')) {
              return 'hooks';
            }
            if (id.includes('/workers/')) {
              return 'workers';
            }
          },
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
      assetsInlineLimit: 4096, // 4kb - inline small assets
      sourcemap: true, // Enable source maps for debugging in production
      reportCompressedSize: true,
      chunkSizeWarningLimit: 1000, // Increase the warning limit
    },
    server: {
      // Development server configuration
      port: 3000,
      open: true,
      host: true, // Listen on all network interfaces
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },
    preview: {
      port: 3000,
      open: true,
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },
    // Environment variables
    define: {
      'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV || mode),
      'process.env.VITE_APP_VERSION': JSON.stringify(env.npm_package_version),
      'process.env.VITE_APP_BUILD_TIME': JSON.stringify(new Date().toISOString()),
    },
    worker: {
      format: 'es', // Worker files as ES modules
      plugins: () => [], // Function that returns an empty array of plugins
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'd3', 'chart.js'], // Pre-bundle these dependencies
      exclude: [], // Don't pre-bundle these
    },
  };
});
