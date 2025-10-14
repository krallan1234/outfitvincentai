import { useEffect } from 'react';

export const usePWA = () => {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
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

      // Check if window is already loaded
      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW, { once: true });
      }
    }

    // Handle install prompt
    let deferredPrompt: any;
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      // You can show custom install button here
    };

    const handleAppInstalled = () => {
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return {
    isSupported: 'serviceWorker' in navigator,
  };
};
