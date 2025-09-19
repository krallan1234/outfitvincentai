import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface OutfitModalProps {
  outfit: any;
  isOpen: boolean;
  onClose: () => void;
  onLike?: (id: string) => void;
  showLikeButton?: boolean;
}

export const OutfitModal = ({ outfit, isOpen, onClose, onLike, showLikeButton = false }: OutfitModalProps) => {
  const [clothesImages, setClothesImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  useEffect(() => {
    if (isOpen && outfit) {
      // For community outfits, use ai_analysis.clothes_analysis if available
      if (outfit.ai_analysis?.clothes_analysis) {
        setClothesImages(outfit.ai_analysis.clothes_analysis);
        setLoading(false);
      } else if (outfit.recommended_clothes?.length > 0) {
        fetchClothesImages();
      } else {
        setClothesImages([]);
        setLoading(false);
      }
    }
  }, [isOpen, outfit]);

  // Early return if outfit is null
  if (!outfit) {
    return null;
  }

  const fetchClothesImages = async () => {
    setLoading(true);
    try {
      // recommended_clothes contains direct UUID strings, not objects
      const clothesIds = outfit.recommended_clothes.filter((id: string) => id && typeof id === 'string');
      
      if (clothesIds.length === 0) {
        setClothesImages([]);
        return;
      }

      const { data, error } = await supabase
        .from('clothes')
        .select('*')
        .in('id', clothesIds);

      if (error) throw error;
      setClothesImages(data || []);
    } catch (error) {
      console.error('Error fetching clothes images:', error);
      setClothesImages([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{outfit.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Outfit Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(outfit.created_at)}
              </div>
              {outfit.mood && (
                <Badge variant="secondary" className="capitalize">
                  {outfit.mood}
                </Badge>
              )}
              {showLikeButton && onLike && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onLike(outfit.id)}
                  className={cn(
                    "ml-auto flex items-center gap-2",
                    outfit.is_liked && "text-red-500"
                  )}
                >
                  <Heart 
                    className={cn(
                      "h-4 w-4",
                      outfit.is_liked && "fill-current"
                    )} 
                  />
                  <span>{outfit.likes_count || 0}</span>
                </Button>
              )}
            </div>

            <p className="text-sm font-medium text-muted-foreground">
              "{outfit.prompt}"
            </p>

            {outfit.description && (
              <p className="text-sm">
                {outfit.description}
              </p>
            )}
          </div>

          {/* Outfit Visual */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Outfit Visualization</h3>
            
            {/* Generated Image */}
            {outfit.generated_image_url && (
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <img
                  src={outfit.generated_image_url}
                  alt={outfit.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Clothes Grid */}
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : clothesImages.length > 0 ? (
              <div>
                <h4 className="text-md font-medium mb-3">Wardrobe Items</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {clothesImages.map((item, index) => (
                    <div key={item.id || index} className="bg-muted rounded-lg overflow-hidden">
                      <div className="aspect-square">
                        <img
                          src={item.image_url}
                          alt={`${item.category || 'Item'} - ${item.color || 'Unknown color'}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium capitalize">{item.category || 'Item'}</p>
                        <p className="text-xs text-muted-foreground capitalize">{item.color || 'Unknown'}</p>
                        {item.style && (
                          <p className="text-xs text-muted-foreground capitalize">{item.style}</p>
                        )}
                        {item.item_name && (
                          <p className="text-xs text-muted-foreground">{item.item_name}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : outfit.recommended_clothes?.length > 0 ? (
              <div className="text-center p-8">
                <p className="text-muted-foreground">
                  Unable to load wardrobe item images
                </p>
              </div>
            ) : null}
          </div>

          {/* AI Analysis */}
          {outfit.ai_analysis && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Style Analysis</h3>
              
              {outfit.ai_analysis.occasion && (
                <div>
                  <span className="font-medium">Perfect for: </span>
                  <span className="text-muted-foreground">{outfit.ai_analysis.occasion}</span>
                </div>
              )}

              {outfit.ai_analysis.styling_tips?.length > 0 && (
                <div>
                  <span className="font-medium">Styling Tips:</span>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {outfit.ai_analysis.styling_tips.map((tip: string, index: number) => (
                      <li key={index} className="text-sm text-muted-foreground">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {outfit.ai_analysis.color_harmony && (
                <div>
                  <span className="font-medium">Color Harmony: </span>
                  <span className="text-muted-foreground">{outfit.ai_analysis.color_harmony}</span>
                </div>
              )}

              {outfit.ai_analysis.style_analysis && (
                <div>
                  <span className="font-medium">Style: </span>
                  <span className="text-muted-foreground">{outfit.ai_analysis.style_analysis}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};