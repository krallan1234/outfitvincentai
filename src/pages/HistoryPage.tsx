import { useAuthStore } from '@/store/useAuthStore';
import { Loader2, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VirtualOutfitList } from '@/components/VirtualOutfitList';
import { OutfitModal } from '@/components/OutfitModal';
import { useState, useEffect } from 'react';
import { useInfiniteOutfits } from '@/hooks/useInfiniteOutfits';
import { useRealtimeOutfits } from '@/hooks/useRealtimeOutfits';
import { useFavorites } from '@/hooks/useFavorites';
import { Button } from '@/components/ui/button';
import { Outfit } from '@/types/outfit';
import { analytics } from '@/lib/analytics';

export const HistoryPage = () => {
  const { user } = useAuthStore();
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteOutfits(user?.id);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const { toggleFavorite, isFavorited } = useFavorites();

  // Enable realtime updates
  useRealtimeOutfits(user?.id);

  const allOutfits = data?.pages.flatMap((page) => page.outfits) || [];

  useEffect(() => {
    analytics.trackPageView('history');
  }, []);

  const handleSelectOutfit = (outfit: Outfit) => {
    setSelectedOutfit(outfit);
    analytics.track('outfit_viewed', { outfit_id: outfit.id, from: 'history' });
  };

  const handleLike = async (outfitId: string) => {
    await toggleFavorite(outfitId);
    analytics.trackOutfitLiked(outfitId);
  };

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
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Outfit History</h1>
        <div className="text-sm text-muted-foreground">
          {allOutfits.length} outfit{allOutfits.length !== 1 ? 's' : ''}
        </div>
      </div>

      {allOutfits.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No outfits yet. Start generating!</p>
          <Button onClick={() => window.location.href = '/generator'}>
            Create Your First Outfit
          </Button>
        </div>
      ) : (
        <>
          <VirtualOutfitList outfits={allOutfits} onSelectOutfit={handleSelectOutfit} />

          {hasNextPage && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={() => {
                  fetchNextPage();
                  analytics.track('load_more_history');
                }}
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
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Load More
                  </>
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
        showLikeButton
        onLike={handleLike}
      />
    </div>
  );
};
