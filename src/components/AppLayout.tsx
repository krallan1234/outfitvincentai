import { ReactNode } from 'react';
import { AppNavigation } from './AppNavigation';
import { AppFooter } from './AppFooter';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNavigation />
      
      {/* Main content with padding for mobile navigation */}
      <main className="lg:pt-0 pt-16 flex-1">
        {children}
      </main>
      
      <AppFooter />
    </div>
  );
};
