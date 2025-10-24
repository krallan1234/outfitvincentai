import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from './ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from './ui/badge';

interface TextureGenerationStatusProps {
  clothingItemIds: string[];
}

interface TextureStatus {
  itemId: string;
  hasTextures: boolean;
  category?: string;
}

export const TextureGenerationStatus = ({ clothingItemIds }: TextureGenerationStatusProps) => {
  const [textureStatuses, setTextureStatuses] = useState<TextureStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkTextureStatus = async () => {
      if (!clothingItemIds || clothingItemIds.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: items, error } = await supabase
          .from('clothes')
          .select('id, category, texture_maps')
          .in('id', clothingItemIds);

        if (error) {
          console.error('Failed to fetch texture status:', error);
          return;
        }

        const statuses: TextureStatus[] = items?.map(item => ({
          itemId: item.id,
          hasTextures: !!item.texture_maps,
          category: item.category
        })) || [];

        setTextureStatuses(statuses);
      } catch (error) {
        console.error('Error checking texture status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkTextureStatus();

    // Poll every 10 seconds to check if textures are ready
    const interval = setInterval(checkTextureStatus, 10000);
    return () => clearInterval(interval);
  }, [clothingItemIds]);

  const itemsWithTextures = textureStatuses.filter(s => s.hasTextures).length;
  const totalItems = textureStatuses.length;
  const allReady = itemsWithTextures === totalItems && totalItems > 0;
  const someGenerating = itemsWithTextures < totalItems && totalItems > 0;

  if (isLoading || totalItems === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-muted/20">
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          {allReady ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  3D Texture Maps Ready
                </p>
                <p className="text-xs text-muted-foreground">
                  All items enhanced with realistic textures for 3D preview
                </p>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                {totalItems}/{totalItems}
              </Badge>
            </>
          ) : someGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Generating 3D Texture Maps
                </p>
                <p className="text-xs text-muted-foreground">
                  AI is creating realistic fabric textures (30-60s per item)
                </p>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                {itemsWithTextures}/{totalItems}
              </Badge>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Texture Generation Pending
                </p>
                <p className="text-xs text-muted-foreground">
                  3D textures will be generated automatically
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
