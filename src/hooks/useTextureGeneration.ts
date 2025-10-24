import { supabase } from '@/integrations/supabase/client';
import { useState, useCallback } from 'react';

interface TextureMaps {
  type: string;
  diffuse_url: string | null;
  normal_url: string | null;
  roughness_url: string | null;
  alpha_url: string | null;
  metadata?: {
    generated_at: string;
    source_image: string;
  };
}

export const useTextureGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const generateTextureMaps = useCallback(async (
    imageUrl: string,
    clothingType: string,
    itemId?: string
  ): Promise<TextureMaps | null> => {
    setIsGenerating(true);
    setProgress(0);

    try {
      // Check cache first - if textures already exist for this item, don't regenerate
      if (itemId) {
        const { data: existingItem } = await supabase
          .from('clothes')
          .select('texture_maps')
          .eq('id', itemId)
          .single();

        if (existingItem?.texture_maps && typeof existingItem.texture_maps === 'object') {
          console.log('Using cached texture maps for item:', itemId);
          setProgress(100);
          return existingItem.texture_maps as unknown as TextureMaps;
        }
      }

      console.log('Generating new texture maps for:', clothingType);
      setProgress(30);

      const { data, error } = await supabase.functions.invoke('generate-texture-maps', {
        body: { imageUrl, clothingType }
      });

      if (error) {
        console.error('Texture generation error:', error);
        throw new Error(`Texture generation failed: ${error.message || 'Unknown error'}`);
      }

      if (!data || !data.diffuse_url) {
        throw new Error('No texture maps returned from AI');
      }

      setProgress(100);
      console.log('Texture maps generated successfully:', data);
      return data as TextureMaps;

    } catch (error) {
      console.error('Failed to generate texture maps:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Detailed error:', errorMsg);
      return null;
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  }, []);

  return {
    generateTextureMaps,
    isGenerating,
    progress
  };
};
