import { useState, useRef, useMemo } from 'react';
import { useOutfits, Outfit } from '@/hooks/useOutfits';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Loader2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { OutfitModal } from '@/components/OutfitModal';
import { OutfitRemixButton } from '@/components/OutfitRemixButton';
import { OptimizedImage } from '@/components/ui/optimized-image';

export const OutfitGallery = () => {
  const { outfits, loading, deleteOutfit } = useOutfits();
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!scrollContainerRef.current) return;
    
    const swipeDistance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (Math.abs(swipeDistance) > minSwipeDistance) {
      const scrollAmount = 300;
      if (swipeDistance > 0) {
        scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      } else {
        scrollContainerRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      }
    }
  };

  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 300, behavior: 'smooth' });
  };

  if (loading && outfits.length === 0) {
    return (
      <div className="flex items-center justify-center p-8" role="status" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
        <span className="sr-only">Loading outfits...</span>
      </div>
    );
  }

  if (outfits.length === 0) {
    return (
      <div className="text-center p-8" role="status">
        <p className="text-muted-foreground">No outfits generated yet. Create your first outfit!</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Grid View */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
        {outfits.map((outfit) => (
          <OutfitCard 
            key={outfit.id} 
            outfit={outfit} 
            onDelete={() => deleteOutfit(outfit.id)}
            onClick={() => setSelectedOutfit(outfit)}
          />
        ))}
      </div>

      {/* Mobile Swipeable View */}
      <div className="md:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={scrollLeft}
            aria-label="Scroll left"
            className="shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div 
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory hide-scrollbar flex-1"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            role="list"
            aria-label="Swipeable outfit gallery"
          >
            {outfits.map((outfit) => (
              <div key={outfit.id} className="snap-center shrink-0 w-80">
                <OutfitCard 
                  outfit={outfit} 
                  onDelete={() => deleteOutfit(outfit.id)}
                  onClick={() => setSelectedOutfit(outfit)}
                />
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={scrollRight}
            aria-label="Scroll right"
            className="shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <OutfitModal
        outfit={selectedOutfit}
        isOpen={!!selectedOutfit}
        onClose={() => setSelectedOutfit(null)}
      />
    </>
  );
};

interface OutfitCardProps {
  outfit: Outfit;
  onDelete: () => void;
  onClick: () => void;
}

const OutfitCard = ({ outfit, onDelete, onClick }: OutfitCardProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Simple blur placeholder
  const blurDataURL = useMemo(() => {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNjY2MiLz48L3N2Zz4=';
  }, []);

  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow touch-manipulation" 
      onClick={onClick}
      role="article"
      aria-label={`${outfit.title} outfit`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Generated Image */}
      {outfit.generated_image_url && (
        <div className="aspect-square relative">
          <OptimizedImage
            src={outfit.generated_image_url}
            alt={`${outfit.title} - ${outfit.prompt}`}
            className="w-full h-full"
            blurDataURL={blurDataURL}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={false}
          />
          <div className="absolute top-2 right-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Delete outfit"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Outfit</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this outfit? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{outfit.title}</CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" aria-hidden="true" />
          <time dateTime={outfit.created_at}>{formatDate(outfit.created_at)}</time>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Mood Badge */}
        {outfit.mood && (
          <Badge variant="secondary" className="capitalize">
            {outfit.mood}
          </Badge>
        )}

        {/* Prompt */}
        <p className="text-sm font-medium text-muted-foreground">
          "{outfit.prompt}"
        </p>

        {/* Description */}
        {outfit.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {outfit.description}
          </p>
        )}

        {/* Occasion */}
        {outfit.ai_analysis?.occasion && (
          <div className="text-xs">
            <span className="font-medium">Perfect for: </span>
            <span className="text-muted-foreground">{outfit.ai_analysis.occasion}</span>
          </div>
        )}

        {/* Styling Tips */}
        {outfit.ai_analysis?.styling_tips && outfit.ai_analysis.styling_tips.length > 0 && (
          <div className="text-xs">
            <span className="font-medium">Tip: </span>
            <span className="text-muted-foreground">{outfit.ai_analysis.styling_tips[0]}</span>
          </div>
        )}

        {/* Items Count */}
        {outfit.recommended_clothes && outfit.recommended_clothes.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Uses {outfit.recommended_clothes.length} items from your wardrobe
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
          <OutfitRemixButton outfit={outfit} variant="outline" />
        </div>
      </CardContent>
    </Card>
  );
};