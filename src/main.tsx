import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './lib/pwa';
import { logger } from './lib/logger';
import { analytics } from './lib/analytics';

// Initialize analytics after DOM is ready
if (typeof window !== 'undefined') {
  setTimeout(() => analytics.init(), 100);
}

// Register PWA Service Worker in production
if (import.meta.env.PROD) {
  registerServiceWorker().catch((err) => {
    logger.error('Failed to register service worker', err);
  });
} else {
  // Clean up service workers in development to avoid conflicts
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
  }
  if ('caches' in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
}

createRoot(document.getElementById('root')!).render(<App />);
