import { useEffect } from 'react';

export const usePWA = () => {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((error) => {
            console.log('SW registration failed: ', error);
          });
      });
    }

    // Handle install prompt
    let deferredPrompt: any;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      // You can show custom install button here
    });

    // Handle app installed
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
    });
  }, []);

  return {
    isSupported: 'serviceWorker' in navigator,
  };
};
