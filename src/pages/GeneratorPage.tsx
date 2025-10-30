import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const OutfitGenerator = lazy(() =>
  import('@/components/OutfitGenerator').then((module) => ({
    default: module.OutfitGenerator,
  }))
);

export const GeneratorPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        }
      >
        <OutfitGenerator />
      </Suspense>
    </div>
  );
};
