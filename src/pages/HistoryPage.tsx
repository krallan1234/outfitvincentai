import { useAuthStore } from '@/store/useAuthStore';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VirtualOutfitList } from '@/components/VirtualOutfitList';
import { OutfitModal } from '@/components/OutfitModal';
import { useState } from 'react';
import { useInfiniteOutfits } from '@/hooks/useInfiniteOutfits';
import { Button } from '@/components/ui/button';
import { Outfit } from '@/types/outfit';

export const HistoryPage = () => {
  const { user } = useAuthStore();
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteOutfits(user?.id);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);

  const allOutfits = data?.pages.flatMap((page) => page.outfits) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>Failed to load outfit history</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Outfit History</h1>

      {allOutfits.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No outfits yet. Start generating!</p>
        </div>
      ) : (
        <>
          <VirtualOutfitList outfits={allOutfits} onSelectOutfit={setSelectedOutfit} />

          {hasNextPage && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                variant="outline"
                size="lg"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading more...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </>
      )}

      <OutfitModal
        outfit={selectedOutfit}
        isOpen={!!selectedOutfit}
        onClose={() => setSelectedOutfit(null)}
      />
    </div>
  );
};
