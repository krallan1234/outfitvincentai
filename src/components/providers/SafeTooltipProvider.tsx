import React, { useEffect, useState } from 'react';
import { TooltipProvider as RadixTooltipProvider } from '@/components/ui/tooltip';

// Safely render TooltipProvider only after the app is mounted to avoid
// React dispatcher issues during HMR/early initialization in some environments.
export const SafeTooltipProvider: React.FC<React.PropsWithChildren<{ delayDuration?: number }>> = ({ children, delayDuration }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <>{children}</>;

  return (
    <RadixTooltipProvider delayDuration={delayDuration}>{children}</RadixTooltipProvider>
  );
};
