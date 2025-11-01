import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { X, Sparkles, CloudRain, TrendingUp, ArrowRight } from 'lucide-react';
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
}

interface OutfitCompareModalProps {
  outfits: [Outfit, Outfit];
  isOpen: boolean;
  onClose: () => void;
}

export const OutfitCompareModal = ({ outfits, isOpen, onClose }: OutfitCompareModalProps) => {
  const [outfit1, outfit2] = outfits;

  const getScoreComparison = (score1?: number, score2?: number) => {
    if (!score1 || !score2) return 'equal';
    if (score1 > score2) return 'left';
    if (score2 > score1) return 'right';
    return 'equal';
  };

  const ScoreRow = ({ 
    label, 
    icon: Icon, 
    score1, 
    score2 
  }: { 
    label: string; 
    icon: any; 
    score1?: number; 
    score2?: number; 
  }) => {
    const comparison = getScoreComparison(score1, score2);

    return (
      <div className="py-4 border-b last:border-b-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">{label}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 items-center">
          {/* Outfit 1 Score */}
          <div className="text-right">
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold",
              comparison === 'left' ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
            )}>
              {score1?.toFixed(1) || 'N/A'}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <Progress 
              value={(score1 || 0) * 10} 
              className="h-2"
            />
            <Progress 
              value={(score2 || 0) * 10} 
              className="h-2"
            />
          </div>

          {/* Outfit 2 Score */}
          <div className="text-left">
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold",
              comparison === 'right' ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
            )}>
              {score2?.toFixed(1) || 'N/A'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Compare Outfits</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <div className="p-6 space-y-8">
            {/* Outfit Images Side-by-Side */}
            <div className="grid grid-cols-2 gap-6">
              {/* Outfit 1 */}
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden">
                  <OutfitCollage
                    items={outfit1.recommended_clothes || []}
                    title={outfit1.title}
                    colorScheme="complementary"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{outfit1.title}</h3>
                  {outfit1.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {outfit1.description}
                    </p>
                  )}
                  {outfit1.mood && (
                    <Badge variant="outline" className="mt-2 capitalize">
                      {outfit1.mood}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Outfit 2 */}
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden">
                  <OutfitCollage
                    items={outfit2.recommended_clothes || []}
                    title={outfit2.title}
                    colorScheme="complementary"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{outfit2.title}</h3>
                  {outfit2.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {outfit2.description}
                    </p>
                  )}
                  {outfit2.mood && (
                    <Badge variant="outline" className="mt-2 capitalize">
                      {outfit2.mood}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Score Comparison */}
            <div className="bg-muted/50 rounded-lg p-6">
              <h3 className="font-semibold mb-6 text-center flex items-center justify-center gap-2">
                <ArrowRight className="w-5 h-5 text-primary" />
                Score Comparison
              </h3>

              <div className="space-y-0">
                <ScoreRow
                  label="Confidence Score"
                  icon={Sparkles}
                  score1={outfit1.confidence_score}
                  score2={outfit2.confidence_score}
                />
                <ScoreRow
                  label="Trend Relevance"
                  icon={TrendingUp}
                  score1={outfit1.trend_relevance}
                  score2={outfit2.trend_relevance}
                />
                <ScoreRow
                  label="Weather Score"
                  icon={CloudRain}
                  score1={outfit1.weather_score}
                  score2={outfit2.weather_score}
                />
              </div>
            </div>

            {/* Styling Tips Comparison */}
            {(outfit1.styling_tips || outfit2.styling_tips) && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Styling Tips
                  </h4>
                  {outfit1.styling_tips && outfit1.styling_tips.length > 0 ? (
                    <ul className="space-y-2">
                      {outfit1.styling_tips.map((tip, i) => (
                        <li key={i} className="flex gap-2 items-start text-sm">
                          <span className="text-primary mt-1">•</span>
                          <span className="text-muted-foreground">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No styling tips available</p>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Styling Tips
                  </h4>
                  {outfit2.styling_tips && outfit2.styling_tips.length > 0 ? (
                    <ul className="space-y-2">
                      {outfit2.styling_tips.map((tip, i) => (
                        <li key={i} className="flex gap-2 items-start text-sm">
                          <span className="text-primary mt-1">•</span>
                          <span className="text-muted-foreground">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No styling tips available</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
