import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Lightbulb, Heart, TrendingUp } from 'lucide-react';

interface AIStylistExplanationProps {
  outfit: {
    title: string;
    description?: string;
    ai_analysis?: {
      occasion?: string | string[];
      styling_tips?: string[];
      color_harmony?: string;
      style_context?: string;
      used_pinterest_trends?: boolean;
    };
    mood?: string;
  };
}

export const AIStylistExplanation = ({ outfit }: AIStylistExplanationProps) => {
  const aiAnalysis = outfit.ai_analysis;

  if (!aiAnalysis && !outfit.description) {
    return null;
  }

  const occasions = Array.isArray(aiAnalysis?.occasion)
    ? aiAnalysis.occasion
    : aiAnalysis?.occasion
    ? [aiAnalysis.occasion]
    : [];

  return (
    <Card className="bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" aria-hidden="true" />
          <h3 className="text-lg font-semibold font-serif">AI Stylist's Take</h3>
        </div>

        {/* Main Description */}
        {outfit.description && (
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-primary mt-1 flex-shrink-0" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-foreground/90">
                {outfit.description}
              </p>
            </div>
          </div>
        )}

        {/* Style Context & Mood */}
        {(aiAnalysis?.style_context || outfit.mood) && (
          <div className="flex flex-wrap gap-2">
            {aiAnalysis?.style_context && (
              <Badge variant="secondary" className="capitalize">
                <TrendingUp className="h-3 w-3 mr-1" aria-hidden="true" />
                {aiAnalysis.style_context} Style
              </Badge>
            )}
            {outfit.mood && (
              <Badge variant="secondary" className="capitalize">
                <Heart className="h-3 w-3 mr-1" aria-hidden="true" />
                {outfit.mood} Mood
              </Badge>
            )}
            {aiAnalysis?.used_pinterest_trends && (
              <Badge variant="secondary">
                <Sparkles className="h-3 w-3 mr-1" aria-hidden="true" />
                Trend-Inspired
              </Badge>
            )}
          </div>
        )}

        {/* Perfect For */}
        {occasions.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground/80">Perfect for:</p>
            <div className="flex flex-wrap gap-2">
              {occasions.map((occasion, index) => (
                <Badge key={index} variant="outline" className="capitalize">
                  {occasion}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Color Harmony */}
        {aiAnalysis?.color_harmony && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground/80">Color Harmony:</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {aiAnalysis.color_harmony}
            </p>
          </div>
        )}

        {/* Styling Tips */}
        {aiAnalysis?.styling_tips && aiAnalysis.styling_tips.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground/80 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-accent" aria-hidden="true" />
              Styling Tips:
            </p>
            <ul className="space-y-1.5 pl-1">
              {aiAnalysis.styling_tips.map((tip, index) => (
                <li key={index} className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                  <span className="text-accent mt-0.5" aria-hidden="true">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pro Tip Box */}
        <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
          <p className="text-xs text-muted-foreground leading-relaxed">
            💡 <span className="font-medium">Pro tip:</span> Try swapping individual items using the "Replace" button to see how different pieces change the overall vibe!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
