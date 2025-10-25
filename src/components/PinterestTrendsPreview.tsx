import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TrendingUp, ExternalLink } from 'lucide-react';

interface PinterestPin {
  id: string;
  title: string;
  description: string;
  image_url: string;
  link: string;
  save_count?: number;
  dominant_color?: string;
}

interface PinterestTrendsPreviewProps {
  pins: PinterestPin[];
  query: string;
}

export const PinterestTrendsPreview = ({ pins, query }: PinterestTrendsPreviewProps) => {
  if (pins.length === 0) return null;

  const displayPins = pins.slice(0, 4);

  return (
    <Card className="p-4 space-y-3 bg-muted/30">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Pinterest Trends Active</span>
        <Badge variant="secondary" className="text-xs">
          {pins.length} trending pins
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        AI is inspired by trending "{query}" styles on Pinterest
      </p>

      <div className="grid grid-cols-4 gap-2">
        {displayPins.map((pin) => (
          <a
            key={pin.id}
            href={pin.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative aspect-square rounded-md overflow-hidden border border-border hover:border-primary transition-colors"
          >
            <img
              src={pin.image_url}
              alt={pin.title || 'Pinterest inspiration'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <ExternalLink className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </a>
        ))}
      </div>
    </Card>
  );
};
