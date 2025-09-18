import { useOutfits, Outfit } from '@/hooks/useOutfits';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Loader2, Calendar } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { OutfitModal } from '@/components/OutfitModal';
import { useState } from 'react';

export const OutfitGallery = () => {
  const { outfits, loading, deleteOutfit } = useOutfits();
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);

  if (loading && outfits.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (outfits.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No outfits generated yet. Create your first outfit!</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {outfits.map((outfit) => (
          <OutfitCard 
            key={outfit.id} 
            outfit={outfit} 
            onDelete={() => deleteOutfit(outfit.id)}
            onClick={() => setSelectedOutfit(outfit)}
          />
        ))}
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

  return (
    <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      {/* Generated Image */}
      {outfit.generated_image_url && (
        <div className="aspect-square relative">
          <img
            src={outfit.generated_image_url}
            alt={outfit.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-4 w-4" />
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
          <Calendar className="h-4 w-4" />
          {formatDate(outfit.created_at)}
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
      </CardContent>
    </Card>
  );
};