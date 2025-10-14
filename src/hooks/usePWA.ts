import { useEffect } from 'react';

let __pwaInitialized = false;

export const usePWA = () => {
  useEffect(() => {
    if (__pwaInitialized) return;
    __pwaInitialized = true;

    const hasSW = 'serviceWorker' in navigator;

    // In development: aggressively unregister any SW and clear caches to avoid stale bundles and duplicate React
    if (import.meta.env.DEV && hasSW) {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
      if ('caches' in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
      return;
    }

    // Only register in production
    if (!import.meta.env.PROD || !hasSW) return;

    const registerSW = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((error) => {
          console.log('SW registration failed: ', error);
        });
    };

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW, { once: true });
    }

    // Install events (optional)
    let deferredPrompt: any;
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
    };

    const handleAppInstalled = () => {
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return {
    isSupported: 'serviceWorker' in navigator,
  };
};
