import { useEffect } from 'react';

export const usePWA = () => {
  useEffect(() => {
    if (import.meta.env.MODE !== 'production') return;

    // Register service worker
    if ('serviceWorker' in navigator) {
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
    }

    // Handle install prompt
    let deferredPrompt: any;
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      // @ts-ignore
      deferredPrompt = e;
    };
    const handleInstalled = () => {
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('load', () => {});
    };
  }, []);

  return {
    isSupported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
  };
};
