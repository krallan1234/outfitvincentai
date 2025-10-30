import { useAuthStore } from '@/store/useAuthStore';
import { useOutfitsQuery } from '@/hooks/useOutfitsQuery';
import { Loader2, Heart } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OptimizedImage } from '@/components/ui/optimized-image';

export const FavoritesPage = () => {
  const { user } = useAuthStore();
  const { data: outfits, isLoading, error } = useOutfitsQuery(user?.id);

  const favoriteOutfits = useMemo(() => {
    if (!outfits) return [];
    return outfits.filter((outfit) => (outfit.likes_count || 0) > 0);
  }, [outfits]);

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
          <AlertDescription>Failed to load favorites</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-8">
        <Heart className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Favorite Outfits</h1>
      </div>

      {favoriteOutfits.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No favorites yet</h3>
          <p className="text-muted-foreground">
            Like outfits from the community to add them to your favorites
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteOutfits.map((outfit) => (
            <Card key={outfit.id} className="overflow-hidden">
              {outfit.generated_image_url && (
                <div className="aspect-square relative">
                  <OptimizedImage
                    src={outfit.generated_image_url}
                    alt={outfit.title || 'Outfit'}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg">{outfit.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {outfit.mood && (
                  <Badge variant="secondary" className="capitalize">
                    {outfit.mood}
                  </Badge>
                )}
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {outfit.prompt}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
