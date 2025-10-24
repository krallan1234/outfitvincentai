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
    clothingType: string
  ): Promise<TextureMaps | null> => {
    setIsGenerating(true);
    setProgress(0);

    try {
      console.log('Generating texture maps for:', clothingType);
      setProgress(30);

      const { data, error } = await supabase.functions.invoke('generate-texture-maps', {
        body: { imageUrl, clothingType }
      });

      if (error) {
        console.error('Texture generation error:', error);
        throw error;
      }

      setProgress(100);
      console.log('Texture maps generated:', data);
      return data as TextureMaps;

    } catch (error) {
      console.error('Failed to generate texture maps:', error);
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
