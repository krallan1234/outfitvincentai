import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const AdvancedOutfitGenerator = lazy(() =>
  import('@/components/AdvancedOutfitGenerator').then((module) => ({
    default: module.AdvancedOutfitGenerator,
  }))
);

export const AdvancedGeneratorPage = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        }
      >
        <AdvancedOutfitGenerator />
      </Suspense>
    </div>
  );
};
