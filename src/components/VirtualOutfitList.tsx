import { useWindowSize } from '@/hooks/use-window-size';
import { Outfit } from '@/types/outfit';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Calendar } from 'lucide-react';

interface VirtualOutfitListProps {
  outfits: Outfit[];
  onSelectOutfit: (outfit: Outfit) => void;
}

export const VirtualOutfitList = ({ outfits, onSelectOutfit }: VirtualOutfitListProps) => {
  return (
    <div className="space-y-4">
      {outfits.map((outfit) => (
        <Card
          key={outfit.id}
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => onSelectOutfit(outfit)}
        >
          <div className="flex gap-4">
            {outfit.generated_image_url && (
              <div className="w-32 h-32 flex-shrink-0">
                <OptimizedImage
                  src={outfit.generated_image_url}
                  alt={outfit.title || 'Outfit'}
                  className="w-full h-full object-cover rounded-l"
                />
              </div>
            )}
            <div className="flex-1 py-4 pr-4">
              <CardTitle className="text-lg mb-2">{outfit.title}</CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Calendar className="h-4 w-4" />
                <time dateTime={outfit.created_at}>
                  {new Date(outfit.created_at).toLocaleDateString()}
                </time>
              </div>
              {outfit.mood && (
                <Badge variant="secondary" className="capitalize">
                  {outfit.mood}
                </Badge>
              )}
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{outfit.prompt}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
