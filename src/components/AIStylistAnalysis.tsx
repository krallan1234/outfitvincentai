import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp } from 'lucide-react';

interface OutfitSuggestion {
  id: number;
  style_name: string;
  items: Array<{
    type: string;
    description: string;
    item_id?: string;
  }>;
  trend_reason: string;
  trend_sources: string[];
}

interface StylistAnalysis {
  user_style_summary?: string;
  reddit_trend_summary?: string;
  combined_trend_summary?: string;
  outfits?: OutfitSuggestion[];
}

interface AIStylistAnalysisProps {
  analysis: StylistAnalysis;
}

export const AIStylistAnalysis = ({ analysis }: AIStylistAnalysisProps) => {
  if (!analysis) return null;

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle>AI Stylist Analys</CardTitle>
        </div>
        <CardDescription>
          Trendanalys baserat på Reddit, Pinterest och Instagram
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {analysis.user_style_summary && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Din Stil
            </h4>
            <p className="text-sm text-muted-foreground">
              {analysis.user_style_summary}
            </p>
          </div>
        )}

        {analysis.reddit_trend_summary && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Reddit Trender</h4>
            <p className="text-sm text-muted-foreground">
              {analysis.reddit_trend_summary}
            </p>
          </div>
        )}

        {analysis.combined_trend_summary && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Kombinerade Trender</h4>
            <p className="text-sm text-muted-foreground">
              {analysis.combined_trend_summary}
            </p>
          </div>
        )}

        {analysis.outfits && analysis.outfits.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Outfit-Förslag</h4>
            {analysis.outfits.map((outfit) => (
              <div 
                key={outfit.id}
                className="p-4 rounded-lg bg-background/50 border border-border/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h5 className="font-semibold">{outfit.style_name}</h5>
                  <div className="flex gap-1">
                    {outfit.trend_sources.map((source) => (
                      <Badge key={source} variant="secondary" className="text-xs">
                        {source === 'reddit_trends' && '🔴 Reddit'}
                        {source === 'pinterest_data' && '📌 Pinterest'}
                        {source === 'instagram_trends' && '📸 Instagram'}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  {outfit.items.map((item, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-medium capitalize">{item.type}:</span>{' '}
                      <span className="text-muted-foreground">{item.description}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground italic">
                  {outfit.trend_reason}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
