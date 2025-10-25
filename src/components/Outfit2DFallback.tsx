import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImageIcon, RotateCw } from 'lucide-react';

interface Outfit2DFallbackProps {
  clothingItems: any[];
  onRetry?: () => void;
  showRetry?: boolean;
}

const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3C/svg%3E';

export const Outfit2DFallback = ({ clothingItems, onRetry, showRetry = true }: Outfit2DFallbackProps) => {
  return (
    <div className="space-y-4">
      <Alert>
        <ImageIcon className="h-4 w-4" />
        <AlertDescription>
          3D preview is temporarily unavailable — displaying outfit items instead.
        </AlertDescription>
      </Alert>

      {showRetry && onRetry && (
        <div className="flex justify-center">
          <Button onClick={onRetry} variant="outline" size="sm">
            <RotateCw className="h-4 w-4 mr-2" />
            Try 3D again
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {clothingItems.map((item, index) => (
          <Card key={item.id || index} className="overflow-hidden">
            <div className="aspect-square relative bg-muted flex items-center justify-center">
              <img
                src={item.image_url || item.image || item.url || PLACEHOLDER_IMAGE}
                alt={`${item.category || item.type || 'Item'} - ${item.color || item.colors?.[0] || 'Unknown'}`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  const target = e.currentTarget;
                  console.error('[Outfit2DFallback] Image failed to load:', item.image_url);
                  target.src = PLACEHOLDER_IMAGE;
                  target.onerror = null;
                }}
              />
            </div>
            <div className="p-2 text-center">
              <p className="text-xs font-medium truncate">
                {item.category || item.type || 'Item'}
              </p>
              {item.color && (
                <p className="text-xs text-muted-foreground truncate">
                  {item.color}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
