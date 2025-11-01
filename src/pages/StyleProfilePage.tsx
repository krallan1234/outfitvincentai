import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const StyleProfile = lazy(() =>
  import('@/components/StyleProfile').then((module) => ({
    default: module.StyleProfile,
  }))
);

export const StyleProfilePage = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-5xl">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        }
      >
        <StyleProfile />
      </Suspense>
    </div>
  );
};
