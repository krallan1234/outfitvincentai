import { useAuthStore } from '@/store/useAuthStore';
import { Loader2, Heart } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/hooks/useFavorites';
import { OutfitModal } from '@/components/OutfitModal';

export const FavoritesPage = () => {
  const { user } = useAuthStore();
  const { toggleFavorite, isFavorited } = useFavorites();
  const [outfits, setOutfits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      loadFavorites();
    }
  }, [user?.id]);

  const loadFavorites = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Get outfit IDs from likes table
      const { data: likes, error: likesError } = await supabase
        .from('outfit_likes')
        .select('outfit_id')
        .eq('user_id', user.id);

      if (likesError) throw likesError;

      if (!likes || likes.length === 0) {
        setOutfits([]);
        setLoading(false);
        return;
      }

      // Fetch full outfit data
      const { data: outfitData, error: outfitsError } = await supabase
        .from('outfits')
        .select('*')
        .in('id', likes.map(l => l.outfit_id))
        .order('created_at', { ascending: false });

      if (outfitsError) throw outfitsError;

      setOutfits(outfitData || []);
    } catch (err) {
      console.error('Failed to load favorites:', err);
      setError(err instanceof Error ? err.message : 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfavorite = async (outfitId: string) => {
    await toggleFavorite(outfitId);
    // Reload favorites after removal
    loadFavorites();
  };

  if (loading) {
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
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 mb-8">
        <Heart className="w-8 h-8 text-primary fill-current" />
        <h1 className="text-3xl font-bold">Favorite Outfits</h1>
        <Badge variant="secondary" className="ml-2">{outfits.length}</Badge>
      </div>

      {outfits.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No favorites yet</h3>
          <p className="text-muted-foreground">
            Like outfits from the community or your own creations to add them here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {outfits.map((outfit) => (
            <Card 
              key={outfit.id} 
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => setSelectedOutfit(outfit)}
            >
              {outfit.generated_image_url && (
                <div className="aspect-square relative overflow-hidden bg-muted">
                  <OptimizedImage
                    src={outfit.generated_image_url}
                    alt={outfit.title || 'Outfit'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm hover:bg-background"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnfavorite(outfit.id);
                    }}
                  >
                    <Heart className="h-5 w-5 fill-primary text-primary" />
                  </Button>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg line-clamp-1">{outfit.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {outfit.mood && (
                  <Badge variant="secondary" className="capitalize">
                    {outfit.mood}
                  </Badge>
                )}
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {outfit.prompt}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Heart className="h-4 w-4" />
                  <span>{outfit.likes_count || 0} likes</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <OutfitModal
        outfit={selectedOutfit}
        isOpen={!!selectedOutfit}
        onClose={() => setSelectedOutfit(null)}
        showLikeButton
        onLike={handleUnfavorite}
      />
    </div>
  );
};
