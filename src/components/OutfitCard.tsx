import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ThumbsUp, ThumbsDown, Sparkles, CloudRain, TrendingUp } from 'lucide-react';
import { OutfitCollage } from './OutfitCollage';
import { cn } from '@/lib/utils';
import { AdvancedOutfit } from '@/hooks/useAdvancedOutfitGenerator';

interface OutfitCardProps {
  outfit: AdvancedOutfit;
  onLike: () => void;
  onDislike: () => void;
}

export const OutfitCard = ({ outfit, onLike, onDislike }: OutfitCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 8.5) return 'bg-green-500';
    if (score >= 7.0) return 'bg-blue-500';
    return 'bg-yellow-500';
  };

  const formatBreakdownLabel = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').trim();
  };

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-300 cursor-pointer",
        "hover:shadow-2xl hover:scale-[1.02]",
        isHovered && "ring-2 ring-primary"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Confidence Badge */}
      <Badge 
        className={cn(
          "absolute top-4 right-4 z-10",
          getScoreColor(outfit.confidenceScore)
        )}
      >
        <Sparkles className="w-3 h-3 mr-1" />
        {outfit.confidenceScore.toFixed(1)}/10
      </Badge>

      {/* Outfit Preview */}
      <CardHeader className="p-0">
        <div className="relative">
          <OutfitCollage 
            items={outfit.outfit.recommended_clothes || []}
            title={outfit.outfit.title || 'Outfit'}
            colorScheme="complementary"
          />
        </div>
      </CardHeader>

      {/* Details */}
      <CardContent className="space-y-4 p-6">
        <CardTitle className="line-clamp-2 text-lg">
          {outfit.outfit.title || outfit.outfit.description || 'Stylish Outfit'}
        </CardTitle>

        {/* Confidence Breakdown */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Confidence Breakdown</Label>
          {Object.entries(outfit.confidenceBreakdown).map(([key, value]) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground capitalize">
                  {formatBreakdownLabel(key)}
                </span>
                <span className="font-medium">{(value * 10).toFixed(0)}%</span>
              </div>
              <Progress value={value * 10} className="h-2" />
            </div>
          ))}
        </div>

        {/* Expandable Sections */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="tips" className="border-b">
            <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Styling Tips ({outfit.stylingTips.length})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2 mt-2">
                {outfit.stylingTips.map((tip, i) => (
                  <li key={i} className="text-sm flex gap-2 items-start">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">{tip}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="weather" className="border-b">
            <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
              <div className="flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-primary" />
                Weather Suitability
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground mt-2">
                {outfit.weatherNotes}
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="trends" className="border-none">
            <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Trend Analysis
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground mt-2">
                {outfit.trendAnalysis}
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Feedback Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant={outfit.userFeedback === 'like' ? 'default' : 'outline'}
            size="sm"
            className="flex-1 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              onLike();
            }}
          >
            <ThumbsUp className="w-4 h-4 mr-2" />
            {outfit.userFeedback === 'like' ? 'Liked' : 'Like'}
          </Button>
          <Button
            variant={outfit.userFeedback === 'dislike' ? 'destructive' : 'outline'}
            size="sm"
            className="flex-1 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              onDislike();
            }}
          >
            <ThumbsDown className="w-4 h-4 mr-2" />
            {outfit.userFeedback === 'dislike' ? 'Disliked' : 'Pass'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
