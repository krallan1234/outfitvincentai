import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ClothingItem, useClothes } from '@/hooks/useClothes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Loader2, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { OptimizedImage } from '@/components/ui/optimized-image';
import useEmblaCarousel from 'embla-carousel-react';

interface ClothesGalleryProps {
  selectionMode?: boolean;
  selectedItemId?: string;
  selectedItemIds?: string[];
  onSelectItem?: (item: ClothingItem) => void;
  multiSelect?: boolean;
}

export const ClothesGallery = ({ 
  selectionMode = false, 
  selectedItemId, 
  selectedItemIds = [],
  onSelectItem,
  multiSelect = false 
}: ClothesGalleryProps) => {
  const { clothes, loading, deleteClothing } = useClothes();
  
  // Embla carousel for better mobile experience
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    align: 'start',
    dragFree: true,
    containScroll: 'trimSnaps'
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  if (loading && clothes.length === 0) {
    return (
      <div className="flex items-center justify-center p-8" role="status" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
        <span className="sr-only">Loading clothes...</span>
      </div>
    );
  }

  if (clothes.length === 0) {
    return (
      <div className="text-center p-8" role="status">
        <p className="text-muted-foreground">No clothing items uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full" role="region" aria-label="Clothing gallery">
      {/* Desktop Grid View - 4 columns on large screens */}
      <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-4">
        {clothes.map((item) => (
          <ClothingCard 
            key={item.id} 
            item={item} 
            onDelete={() => deleteClothing(item.id)}
            selectionMode={selectionMode}
            isSelected={multiSelect ? selectedItemIds.includes(item.id) : selectedItemId === item.id}
            onSelect={() => onSelectItem?.(item)}
          />
        ))}
      </div>

      {/* Mobile Carousel View - smooth horizontal scrolling with 2 items visible */}
      <div className="md:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            aria-label="Scroll left"
            className="shrink-0 h-10 w-10 disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div className="overflow-hidden flex-1" ref={emblaRef}>
            <div className="flex gap-3" role="list" aria-label="Swipeable clothing items">
              {clothes.map((item) => (
                <div key={item.id} className="flex-[0_0_calc(50%-6px)] min-w-0">
                  <ClothingCard 
                    item={item} 
                    onDelete={() => deleteClothing(item.id)}
                    selectionMode={selectionMode}
                    isSelected={multiSelect ? selectedItemIds.includes(item.id) : selectedItemId === item.id}
                    onSelect={() => onSelectItem?.(item)}
                  />
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={scrollNext}
            disabled={!canScrollNext}
            aria-label="Scroll right"
            className="shrink-0 h-10 w-10 disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

interface ClothingCardProps {
  item: ClothingItem;
  onDelete: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

const ClothingCard = ({ item, onDelete, selectionMode, isSelected, onSelect }: ClothingCardProps) => {
  const { signedUrl, loading: urlLoading, error: urlError } = useSignedUrl('clothes', item.image_url);

  // Generate a simple blur placeholder (in production, generate during upload)
  const blurDataURL = useMemo(() => {
    // Simple 1x1 pixel blur placeholder
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNjY2MiLz48L3N2Zz4=';
  }, []);

  return (
    <Card 
      className={`overflow-hidden transition-all hover:shadow-lg ${isSelected ? 'ring-2 ring-primary shadow-xl scale-[1.02]' : ''} ${selectionMode ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
      role="article"
      aria-label={`${item.category} clothing item${isSelected ? ', selected' : ''}`}
    >
      <div className="aspect-square relative bg-muted" onClick={selectionMode ? onSelect : undefined}>
        {urlError ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground p-4">
            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs text-center">Image unavailable</span>
          </div>
        ) : signedUrl ? (
          <OptimizedImage
            src={signedUrl}
            alt={`${item.category}${item.color ? ` in ${item.color}` : ''}${item.description ? ` - ${item.description}` : ''}`}
            className="w-full h-full"
            blurDataURL={blurDataURL}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : urlLoading ? (
          <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center" aria-hidden="true">
            <span className="text-muted-foreground text-sm">Loading...</span>
          </div>
        ) : null}
        {selectionMode && isSelected && (
          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[2px]">
            <Badge className="bg-primary text-primary-foreground shadow-lg">
              <Sparkles className="h-3 w-3 mr-1" />
              Selected
            </Badge>
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-2">
          {selectionMode && (
            <Button 
              variant={isSelected ? "default" : "secondary"} 
              size="icon" 
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.();
              }}
              aria-label={isSelected ? "Deselect item" : "Select item"}
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
          {!selectionMode && (
            <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                size="icon" 
                className="h-8 w-8"
                aria-label="Delete clothing item"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Clothing Item</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this clothing item? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          )}
        </div>
      </div>
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {item.category}
            </Badge>
            {item.ai_detected_metadata?.confidence && (
              <Badge 
                variant={item.ai_detected_metadata.confidence === 'high' ? 'default' : 'outline'}
                className="text-xs"
                aria-label={`AI detection confidence: ${item.ai_detected_metadata.confidence}`}
              >
                AI: {item.ai_detected_metadata.confidence}
              </Badge>
            )}
          </div>
          
          {item.color && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Color:</span> {item.color}
            </p>
          )}
          
          {item.style && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Style:</span> {item.style}
            </p>
          )}
          
          {item.brand && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Brand:</span> {item.brand}
            </p>
          )}
          
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {item.description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};