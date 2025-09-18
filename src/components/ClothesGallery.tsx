import { ClothingItem, useClothes } from '@/hooks/useClothes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export const ClothesGallery = () => {
  const { clothes, loading, deleteClothing } = useClothes();

  if (loading && clothes.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (clothes.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No clothing items uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {clothes.map((item) => (
        <ClothingCard 
          key={item.id} 
          item={item} 
          onDelete={() => deleteClothing(item.id)} 
        />
      ))}
    </div>
  );
};

interface ClothingCardProps {
  item: ClothingItem;
  onDelete: () => void;
}

const ClothingCard = ({ item, onDelete }: ClothingCardProps) => {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-square relative">
        <img
          src={item.image_url}
          alt={item.description || 'Clothing item'}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon" className="h-8 w-8">
                <Trash2 className="h-4 w-4" />
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