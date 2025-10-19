import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Heart, ExternalLink, ShoppingBag, MessageCircle, Sparkles, CalendarPlus, Box, ScanFace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CommentsSection } from '@/components/CommentsSection';
import { OutfitRemixButton } from '@/components/OutfitRemixButton';
import { Outfit3DViewer } from '@/components/Outfit3DViewer';
import { VirtualTryOn } from '@/components/VirtualTryOn';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3C/svg%3E';

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
  const [showCalendarDialog, setShowCalendarDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !outfit) return;

    const owner = !!userId && outfit.user_id === userId;

    // For owner's outfits, always fetch actual wardrobe items
    if (owner && Array.isArray(outfit.recommended_clothes) && outfit.recommended_clothes.length > 0) {
      fetchClothesImages();
      return;
    }

    // For non-owner outfits, use AI visualization if available
    if (Array.isArray(outfit.ai_analysis?.outfit_visualization?.items) && outfit.ai_analysis.outfit_visualization.items.length > 0) {
      setClothesImages(outfit.ai_analysis.outfit_visualization.items);
      setLoading(false);
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
    <Dialog open={isOpen} onOpenChange={onClose} modal>
      <DialogContent 
        className="max-w-4xl h-[90vh] w-[95vw] xs:w-[90vw] card-elegant border-primary/20 p-0 gap-0 flex flex-col"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          touchAction: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
        onTouchMove={(e) => {
          // Allow scrolling only inside the scrollable content area
          if (!(e.target as HTMLElement).closest('[data-scroll-container]')) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="space-y-2 flex-shrink-0 px-3 xs:px-4 sm:px-6 pt-3 xs:pt-4 sm:pt-6 pb-3 select-none">
          <DialogTitle className="text-lg xs:text-xl sm:text-2xl font-serif bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent leading-tight">
            {outfit.title}
          </DialogTitle>
        </DialogHeader>

        <div 
          data-scroll-container
          className="flex-1 overflow-y-auto overflow-x-hidden px-3 xs:px-4 sm:px-6 pb-3 xs:pb-4 sm:pb-6 overscroll-contain"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth',
          }}
        >
          <div className="space-y-4 sm:space-y-6">
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

            {/* Action Buttons */}
            {userId && outfit.user_id === userId && (
              <div className="flex gap-2 flex-wrap pt-2">
                <OutfitRemixButton outfit={outfit} variant="outline" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Navigate to calendar page - assuming there's a way to do this
                    window.location.href = '/calendar';
                  }}
                >
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Add to Calendar
                </Button>
              </div>
            )}
          </div>

          {/* Outfit Visual */}
          <div className="space-y-3 sm:space-y-4">
            <Tabs defaultValue="2d" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="2d">
                  <Sparkles className="h-4 w-4 mr-2" />
                  2D Image
                </TabsTrigger>
                <TabsTrigger value="3d">
                  <Box className="h-4 w-4 mr-2" />
                  3D Preview
                </TabsTrigger>
                <TabsTrigger value="ar">
                  <ScanFace className="h-4 w-4 mr-2" />
                  Try On
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="2d" className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold font-serif flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  Outfit Visualization
                </h3>
                
                {/* Generated Image */}
                {outfit.generated_image_url && (
                  <div className="w-full bg-muted rounded-xl overflow-hidden shadow-elegant border border-primary/10 aspect-[3/4] sm:aspect-video flex items-center justify-center">
                    <img
                      src={outfit.generated_image_url}
                      alt={outfit.title}
                      className="w-full h-full object-contain pointer-events-none select-none transition-none"
                      loading="eager"
                      style={{ 
                        minHeight: '200px',
                        maxHeight: '50vh',
                      }}
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center text-muted-foreground">
                              <span>Image preview unavailable</span>
                            </div>
                          `;
                        }
                      }}
                    />
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="3d" className="space-y-3 sm:space-y-4">
                {outfit.generated_image_url && (
                  <Outfit3DViewer
                    imageUrl={outfit.generated_image_url}
                    title={outfit.title}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="ar" className="space-y-3 sm:space-y-4">
                {outfit.generated_image_url && (
                  <VirtualTryOn outfitImageUrl={outfit.generated_image_url} />
                )}
              </TabsContent>
            </Tabs>

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
                        "bg-muted/50 rounded-xl overflow-hidden border border-primary/10 transition-none hover:shadow-md",
                        item.is_selected && "ring-2 ring-primary shadow-lg bg-primary/5"
                      )}
                    >
                      <div className="aspect-square relative bg-muted/30">
                          <img
                            src={item.image_url || item.image || item.url || PLACEHOLDER_IMAGE}
                            alt={`${item.category || item.type || 'Item'} - ${item.color || (item.colors?.[0]) || 'Unknown color'}`}
                            className="w-full h-full object-cover pointer-events-none select-none transition-none"
                            loading="eager"
                            style={{
                              minHeight: '150px',
                            }}
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.src = PLACEHOLDER_IMAGE;
                            }}
                          />
                          {item.is_selected && (
                            <div className="absolute top-1 right-1 sm:top-2 sm:right-2 pointer-events-none">
                              <Badge className="bg-primary text-primary-foreground text-xs">
                                Base Item
                              </Badge>
                            </div>
                          )}
                      </div>
                      <div className="p-2 sm:p-3 select-none">
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
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border border-primary/10 rounded-xl transition-colors sm:hover:bg-primary/5 sm:hover:border-primary/20">
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
                        className="min-h-[44px] min-w-[120px] text-sm sm:text-base active:scale-95 transition-transform"
                      >
                        <a 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-2 justify-center"
                          onClick={(e) => e.stopPropagation()}
                        >
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
        </div>
      </DialogContent>
    </Dialog>
  );
};