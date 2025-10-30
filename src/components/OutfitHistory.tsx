import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, TrendingUp } from 'lucide-react';
import { Outfit } from '@/types/outfit';
import { useMemo } from 'react';

interface OutfitHistoryProps {
  outfits: Outfit[];
}

export const OutfitHistory = ({ outfits }: OutfitHistoryProps) => {
  const insights = useMemo(() => {
    if (outfits.length === 0) return null;

    const colorMap = new Map<string, number>();
    const styleMap = new Map<string, number>();

    outfits.forEach((outfit) => {
      if (outfit.mood) {
        styleMap.set(outfit.mood, (styleMap.get(outfit.mood) || 0) + 1);
      }
    });

    const topColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([color]) => color);

    const topStyles = Array.from(styleMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([style]) => style);

    return {
      totalOutfits: outfits.length,
      favoriteColors: topColors,
      favoriteStyles: topStyles,
      lastOutfit: outfits[0]
        ? {
            title: outfits[0].title,
            mood: outfits[0].mood,
            created_at: outfits[0].created_at,
          }
        : undefined,
    };
  }, [outfits]);

  if (!insights || insights.totalOutfits === 0) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6 text-center text-muted-foreground">
          <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Generate your first outfit to see personalized insights!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Your Style Insights
        </CardTitle>
        <CardDescription>
          Based on your {insights.totalOutfits} generated outfit{insights.totalOutfits > 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.lastOutfit && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Last outfit:</p>
            <p className="text-sm text-muted-foreground">{insights.lastOutfit.title}</p>
            {insights.lastOutfit.mood && (
              <Badge variant="secondary" className="mt-1 capitalize">
                {insights.lastOutfit.mood}
              </Badge>
            )}
          </div>
        )}

        {insights.favoriteStyles.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Your go-to moods:</p>
            <div className="flex flex-wrap gap-2">
              {insights.favoriteStyles.map(style => (
                <Badge key={style} variant="outline" className="capitalize">
                  {style}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          💡 Tip: Try different moods and styles to discover new combinations!
        </p>
      </CardContent>
    </Card>
  );
};
