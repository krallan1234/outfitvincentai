import { useMutation, useQueryClient } from '@tanstack/react-query';
import { outfitsApi, profilesApi } from '@/api/supabase';
import { supabase } from '@/integrations/supabase/client';
import { OutfitGenerationParamsSchema } from '@/lib/validations';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { z } from 'zod';

interface GenerateOutfitInput {
  prompt: string;
  occasion?: string;
  weather?: any;
  selectedItems?: any[];
  pinterestContext?: string;
  pinterestPins?: any[];
  forceVariety?: boolean;
}

export const useGenerateOutfit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: GenerateOutfitInput) => {
      // Validate input
      const validated = OutfitGenerationParamsSchema.parse(params);
      logger.info('Starting outfit generation', { prompt: validated.prompt });

      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch preferences
      let preferences;
      try {
        preferences = await profilesApi.getProfile(user.id);
      } catch (err) {
        logger.warn('Could not load preferences, continuing without', { error: err });
      }

      // Generate outfit
      const response = await outfitsApi.generateOutfit({
        prompt: validated.prompt,
        occasion: validated.occasion,
        weather: validated.weather,
        selectedItems: validated.selectedItems,
        pinterestContext: validated.pinterestContext,
        pinterestPins: validated.pinterestPins,
        preferences,
      });

      logger.info('Outfit generation response received', {
        success: response?.success,
        hasOutfit: !!response?.data?.outfit,
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Generation failed');
      }

      const outfit = response.data?.outfit;
      if (!outfit) {
        throw new Error('No outfit data received');
      }

      return {
        outfit,
        recommendedClothes: response.data?.recommendedClothes || [],
        fromCache: response.meta?.fromCache || false,
      };
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['outfits'] });
      toast.success(data.fromCache ? 'Loaded from cache!' : 'Outfit generated successfully!');
      logger.info('Outfit generation succeeded', { outfitId: data.outfit.id });
    },
    onError: (error) => {
      const errorMessage =
        error instanceof z.ZodError
          ? error.errors[0].message
          : error instanceof Error
            ? error.message
            : 'Failed to generate outfit';

      logger.error('Outfit generation failed', error);
      toast.error(errorMessage);
    },
  });
};
