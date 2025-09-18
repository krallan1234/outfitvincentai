import { ReactNode } from 'react';
import { AppNavigation } from './AppNavigation';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <AppNavigation />
      
      {/* Main content with padding for mobile navigation */}
      <main className="lg:pt-0 pt-16">
        {children}
      </main>
    </div>
  );
};