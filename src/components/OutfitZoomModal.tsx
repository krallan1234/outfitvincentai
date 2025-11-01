import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Heart, Share2, X, Sparkles, CloudRain, TrendingUp } from 'lucide-react';
import { OutfitCollage } from './OutfitCollage';
import { cn } from '@/lib/utils';

interface Outfit {
  id: string;
  title: string;
  description?: string;
  recommended_clothes?: any[];
  mood?: string;
  confidence_score?: number;
  trend_relevance?: number;
  weather_score?: number;
  styling_tips?: string[];
  prompt?: string;
}

interface OutfitZoomModalProps {
  outfit: Outfit;
  isOpen: boolean;
  onClose: () => void;
  onFavorite: () => void;
  isFavorite: boolean;
}

export const OutfitZoomModal = ({ 
  outfit, 
  isOpen, 
  onClose, 
  onFavorite, 
  isFavorite 
}: OutfitZoomModalProps) => {
  const getScoreColor = (score?: number) => {
    if (!score) return 'bg-gray-500';
    if (score >= 8.5) return 'bg-green-500';
    if (score >= 7.0) return 'bg-blue-500';
    return 'bg-yellow-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{outfit.title}</DialogTitle>
              {outfit.description && (
                <p className="text-sm text-muted-foreground">{outfit.description}</p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant={isFavorite ? 'default' : 'outline'}
              size="sm"
              onClick={onFavorite}
            >
              <Heart className={cn(
                "w-4 h-4 mr-2",
                isFavorite && "fill-current"
              )} />
              {isFavorite ? 'Saved' : 'Save'}
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="px-6 pb-6 space-y-6">
            {/* Outfit Image */}
            <div className="relative rounded-lg overflow-hidden">
              <OutfitCollage
                items={outfit.recommended_clothes || []}
                title={outfit.title}
                colorScheme="complementary"
              />
            </div>

            {/* Scores */}
            <div className="grid grid-cols-3 gap-4">
              {outfit.confidence_score && (
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className={cn(
                    "inline-flex items-center gap-2 px-3 py-1 rounded-full text-white mb-2",
                    getScoreColor(outfit.confidence_score)
                  )}>
                    <Sparkles className="w-4 h-4" />
                    <span className="font-semibold">{outfit.confidence_score.toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Confidence</p>
                </div>
              )}

              {outfit.trend_relevance && (
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary text-primary-foreground mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-semibold">{outfit.trend_relevance.toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Trend</p>
                </div>
              )}

              {outfit.weather_score && (
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500 text-white mb-2">
                    <CloudRain className="w-4 h-4" />
                    <span className="font-semibold">{outfit.weather_score.toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Weather</p>
                </div>
              )}
            </div>

            {/* Styling Tips */}
            {outfit.styling_tips && outfit.styling_tips.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Styling Tips
                </h3>
                <ul className="space-y-2">
                  {outfit.styling_tips.map((tip, i) => (
                    <li key={i} className="flex gap-2 items-start text-sm">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-muted-foreground">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Mood & Prompt */}
            <div className="space-y-3">
              {outfit.mood && (
                <div>
                  <p className="text-sm font-medium mb-2">Mood</p>
                  <Badge variant="secondary" className="capitalize">
                    {outfit.mood}
                  </Badge>
                </div>
              )}

              {outfit.prompt && (
                <div>
                  <p className="text-sm font-medium mb-2">Original Prompt</p>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {outfit.prompt}
                  </p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
