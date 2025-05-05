/**
 * main.tsx - Enhanced entry point for the application
 * 
 * This file initializes the React application and mounts it to the DOM.
 * It also sets up essential configuration, error handling, and service worker.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { perfMonitor } from '@utils/monitoring';
import { initializeCoordinates } from '@utils/coordsHelper';

// Register service worker
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      // The base path needs to be the correct URL path
      const base = '/route-radar';
      
      // Check if we're in production (Github Pages) or development
      const isProd = import.meta.env.PROD;
      
      if (!isProd) {
        // Don't register service worker in development mode
        console.log('Service worker registration skipped in development mode');
        return;
      }
      
      // Registration options
      const options = {
        scope: base + '/'
      };
      
      // Ensure service worker file exists by fetching it first
      const response = await fetch(base + '/service-worker.js');
      if (!response.ok) {
        throw new Error(`Service worker file not found: ${response.status}`);
      }
      
      // Register service worker
      const registration = await navigator.serviceWorker.register(
        base + '/service-worker.js',
        options
      );
      
      console.log('Service worker registered successfully:', registration.scope);
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('Service worker update found!');
        
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('New service worker installed, but waiting to activate');
            
            // Create a more user-friendly update notification
            const updateNotification = document.createElement('div');
            updateNotification.className = 'update-notification';
            updateNotification.innerHTML = `
              <div class="update-notification-content">
                <p>A new version is available!</p>
                <button id="update-button">Update Now</button>
                <button id="update-later-button">Later</button>
              </div>
            `;
            
            document.body.appendChild(updateNotification);
            
            // Add update button event listener
            document.getElementById('update-button')?.addEventListener('click', () => {
              // Send message to service worker to skip waiting
              newWorker.postMessage({ action: 'SKIP_WAITING' });
              window.location.reload();
            });
            
            // Add dismiss button event listener
            document.getElementById('update-later-button')?.addEventListener('click', () => {
              updateNotification.remove();
            });
          }
        });
      });
      
    } catch (error) {
      console.error('Service worker registration failed:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
    }
  } else {
    console.info('Service workers are not supported in this browser');
  }
}

// Start performance monitoring
perfMonitor.start('app:initialization');

// Initialize coordinates data
initializeCoordinates().catch(err => {
  console.error('Failed to initialize coordinates data:', err);
});

// Mount the React application
const root = document.getElementById('root');

if (root) {
  // Create a React root
  const reactRoot = ReactDOM.createRoot(root);
  
  // Render the application
  reactRoot.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  console.log('Application mounted successfully');
  
  // End initialization timing
  perfMonitor.end('app:initialization');
  
  // Register service worker after the app has mounted
  registerServiceWorker();
  
  // Initialize Web Vitals monitoring
  try {
    import('web-vitals').then(({ getCLS, getFID, getLCP, getFCP, getTTFB }) => {
      getCLS(metric => console.log('CLS:', metric.value));
      getFID(metric => console.log('FID:', metric.value));
      getLCP(metric => console.log('LCP:', metric.value));
      getFCP(metric => console.log('FCP:', metric.value));
      getTTFB(metric => console.log('TTFB:', metric.value));
    });
  } catch (error) {
    console.warn('Failed to import web-vitals:', error);
  }
} else {
  console.error('Root element not found. Application cannot be mounted.');
}

// Add CSS for update notification
const style = document.createElement('style');
style.textContent = `
  .update-notification {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    max-width: 300px;
    padding: 15px;
  }
  
  .update-notification-content {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .update-notification p {
    margin: 0;
    font-weight: bold;
  }
  
  .update-notification button {
    padding: 8px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  #update-button {
    background-color: #4f46e5;
    color: white;
  }
  
  #update-later-button {
    background-color: #e5e7eb;
    color: #374151;
  }
`;
document.head.appendChild(style);
