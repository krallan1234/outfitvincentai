import { useEffect } from 'react';

export const usePWA = () => {
  // Service Worker handling
  useEffect(() => {
    const isProd = import.meta.env.PROD;

    if ('serviceWorker' in navigator) {
      if (!isProd) {
        // Development: ensure no SW caches stale bundles
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => regs.forEach((reg) => reg.unregister().catch(() => {})));

        if ('caches' in window) {
          caches
            .keys()
            .then((keys) => keys.forEach((key) => caches.delete(key)))
            .catch(() => {});
        }
        return;
      }

      // Production: register SW on load
      const onLoad = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((error) => {
            console.log('SW registration failed: ', error);
          });
      };

      window.addEventListener('load', onLoad);
      return () => window.removeEventListener('load', onLoad);
    }
  }, []);

  // PWA install events (non-critical)
  useEffect(() => {
    let deferredPrompt: any;
    const beforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as any;
    };

    const onInstalled = () => {
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  return { isSupported: 'serviceWorker' in navigator };
};
