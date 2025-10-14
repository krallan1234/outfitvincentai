import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Heart, ExternalLink, ShoppingBag, MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CommentsSection } from '@/components/CommentsSection';
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
  const [userId, setUserId] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Load current user id once
  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (!error) {
        setUserId(data.user?.id ?? null);
      }
    });
  }, []);

  useEffect(() => {
    if (!isOpen || !outfit) return;

    const owner = !!userId && outfit.user_id === userId;

    // For all outfits, prioritize outfit_visualization.items if available
    if (Array.isArray(outfit.ai_analysis?.outfit_visualization?.items) && outfit.ai_analysis.outfit_visualization.items.length > 0) {
      setClothesImages(outfit.ai_analysis.outfit_visualization.items);
      setLoading(false);
      return;
    }

    // Fallback for owner's outfits: fetch wardrobe items via IDs
    if (owner && Array.isArray(outfit.recommended_clothes) && outfit.recommended_clothes.length > 0) {
      fetchClothesImages();
      return;
    }

    // Fallback: nothing to show
    setClothesImages([]);
    setLoading(false);
  }, [isOpen, outfit, userId]);

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
      <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] xs:w-[90vw] card-elegant border-primary/20 animate-slide-in-right sm:animate-fade-in p-3 xs:p-4 sm:p-6 flex flex-col">
        <DialogHeader className="space-y-2 flex-shrink-0">
          <DialogTitle className="text-lg xs:text-xl sm:text-2xl font-serif bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent leading-tight">
            {outfit.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 overflow-y-auto overscroll-contain -mx-3 xs:-mx-4 sm:-mx-6 px-3 xs:px-4 sm:px-6 flex-1">
          {/* Outfit Details */}
          <div className="space-y-3 p-3 sm:p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl border border-primary/10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {formatDate(outfit.created_at)}
              </div>
              <div className="flex items-center gap-2">
                {outfit.mood && (
                  <Badge variant="secondary" className="capitalize bg-primary/10 text-primary border-primary/20">
                    {outfit.mood}
                  </Badge>
                )}
                {showLikeButton && onLike && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onLike(outfit.id)}
                    className={cn(
                      "flex items-center gap-2 min-w-[44px] min-h-[44px] p-3",
                      outfit.is_liked && "text-red-500"
                    )}
                  >
                    <Heart 
                      className={cn(
                        "h-5 w-5",
                        outfit.is_liked && "fill-current"
                      )} 
                    />
                    <span className="text-base">{outfit.likes_count || 0}</span>
                  </Button>
                )}
              </div>
            </div>

            <p className="text-sm sm:text-base font-medium text-foreground/80 italic leading-relaxed">
              "{outfit.prompt}"
            </p>

            {outfit.description && (
              <p className="text-sm sm:text-base text-foreground/90 leading-relaxed">
                {outfit.description}
              </p>
            )}
          </div>

          {/* Outfit Visual */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold font-serif flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Outfit Visualization
            </h3>
            
            {/* Generated Image */}
            {outfit.generated_image_url && (
              <div className="w-full bg-muted rounded-xl overflow-hidden shadow-elegant border border-primary/10 active:scale-[0.98] sm:hover:scale-[1.02] transition-transform duration-300">
                <img
                  src={outfit.generated_image_url}
                  alt={outfit.title}
                  className="w-full max-h-[50vh] sm:max-h-none object-contain sm:object-cover"
                  loading="lazy"
                />
              </div>
            )}

            {/* Clothes Grid */}
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : clothesImages.length > 0 ? (
              <div className="animate-fade-in">
                <h4 className="text-sm sm:text-md font-semibold mb-3 sm:mb-4 font-serif">Outfit Items</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {clothesImages.map((item, index) => (
                    <div 
                      key={item.id || index} 
                      className={cn(
                        "bg-muted/50 rounded-xl overflow-hidden transition-all active:scale-95 sm:hover:scale-105 hover:shadow-lg border border-primary/10 touch-manipulation",
                        item.is_selected && "ring-2 ring-primary shadow-lg bg-primary/5"
                      )}
                    >
                      <div className="aspect-square relative">
                          <img
                            src={item.image_url || item.image || item.url}
                            alt={`${item.category || item.type || 'Item'} - ${item.color || (item.colors?.[0]) || 'Unknown color'}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {item.is_selected && (
                            <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
                              <Badge className="bg-primary text-primary-foreground text-xs">
                                Base Item
                              </Badge>
                            </div>
                          )}
                      </div>
                      <div className="p-2 sm:p-3">
                        <p className="text-xs sm:text-sm font-medium capitalize">{item.category || 'Item'}</p>
                        <p className="text-xs text-muted-foreground capitalize">{item.color || 'Unknown'}</p>
                        {item.style && (
                          <p className="text-xs text-muted-foreground capitalize">{item.style}</p>
                        )}
                        {item.item_name && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{item.item_name}</p>
                        )}
                        {item.is_selected && item.reasoning && (
                          <p className="text-xs text-primary mt-1 italic line-clamp-2">{item.reasoning}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
) : null}
          </div>

          {/* AI Analysis */}
          {outfit.ai_analysis && (
            <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-gradient-to-br from-accent/5 to-primary/5 rounded-xl border border-accent/10">
              <h3 className="text-base sm:text-lg font-semibold font-serif flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Style Analysis
              </h3>
              
              {outfit.ai_analysis.occasion && (
                <div className="text-sm sm:text-base">
                  <span className="font-medium">Perfect for: </span>
                  <span className="text-muted-foreground">{outfit.ai_analysis.occasion}</span>
                </div>
              )}

              {outfit.ai_analysis.styling_tips?.length > 0 && (
                <div className="text-sm sm:text-base">
                  <span className="font-medium">Styling Tips:</span>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {outfit.ai_analysis.styling_tips.map((tip: string, index: number) => (
                      <li key={index} className="text-sm sm:text-base text-muted-foreground leading-relaxed">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {outfit.ai_analysis.color_harmony && (
                <div className="text-sm sm:text-base">
                  <span className="font-medium">Color Harmony: </span>
                  <span className="text-muted-foreground">{outfit.ai_analysis.color_harmony}</span>
                </div>
              )}

              {outfit.ai_analysis.style_analysis && (
                <div className="text-sm sm:text-base">
                  <span className="font-medium">Style: </span>
                  <span className="text-muted-foreground">{outfit.ai_analysis.style_analysis}</span>
                </div>
              )}
            </div>
          )}

          {/* Where to Buy Section */}
          {outfit.purchase_links && outfit.purchase_links.length > 0 && (
            <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-primary/10">
              <h3 className="text-base sm:text-lg font-semibold font-serif flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Where to Buy
              </h3>
              <div className="grid gap-3">
                {outfit.purchase_links.map((link: any, index: number) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border border-primary/10 rounded-xl active:bg-primary/5 sm:hover:bg-primary/5 sm:hover:border-primary/20 transition-all active:scale-[0.98] sm:hover:scale-[1.02] touch-manipulation">
                    <div className="flex-1">
                      <p className="font-medium text-sm sm:text-base">{link.store_name}</p>
                      {link.price && (
                        <p className="text-sm text-muted-foreground">{link.price}</p>
                      )}
                    </div>
                    {link.url && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="min-h-[44px] min-w-[120px] text-sm sm:text-base"
                      >
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 justify-center">
                          Visit Store
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="mt-6">
            <CommentsSection outfitId={outfit.id} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};