import { useState, useRef, useEffect } from 'react';
import { ClothingItem, useClothes } from '@/hooks/useClothes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Loader2, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useSignedUrl } from '@/hooks/useSignedUrl';

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
        // Swipe left
        scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      } else {
        // Swipe right
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
    <div className="relative" role="region" aria-label="Clothing gallery">
      {/* Desktop Grid View */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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

      {/* Mobile Swipeable View */}
      <div className="md:hidden">
        <div className="flex items-center gap-2 mb-4">
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
            aria-label="Swipeable clothing items"
          >
            {clothes.map((item) => (
              <div key={item.id} className="snap-center shrink-0 w-64">
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
  const [imageLoaded, setImageLoaded] = useState(false);
  // Security: Use signed URL for private storage bucket
  const { signedUrl, loading: urlLoading } = useSignedUrl('clothes', item.image_url);

  return (
    <Card 
      className={`overflow-hidden transition-all ${isSelected ? 'ring-2 ring-primary shadow-lg' : ''} ${selectionMode ? 'cursor-pointer hover:shadow-md' : ''}`}
      role="article"
      aria-label={`${item.category} clothing item${isSelected ? ', selected' : ''}`}
    >
      <div className="aspect-square relative" onClick={selectionMode ? onSelect : undefined}>
        {(!imageLoaded || urlLoading) && (
          <div className="absolute inset-0 bg-muted animate-pulse" aria-hidden="true" />
        )}
        {signedUrl && (
          <img
            src={signedUrl}
            alt={`${item.category}${item.color ? ` in ${item.color}` : ''}${item.description ? ` - ${item.description}` : ''}`}
            className={`w-full h-full object-cover transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
          />
        )}
        {selectionMode && isSelected && (
          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
            <Badge className="bg-primary text-primary-foreground">Selected</Badge>
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