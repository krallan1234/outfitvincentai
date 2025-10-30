import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { outfitsApi } from '@/api/supabase';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export const useOutfitsQuery = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['outfits', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      const outfits = await outfitsApi.fetchOutfits(userId);
      logger.info('Outfits fetched', { count: outfits.length });
      return outfits;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 2,
  });
};

export const useDeleteOutfit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (outfitId: string) => {
      await outfitsApi.deleteOutfit(outfitId);
      logger.info('Outfit deleted', { outfitId });
    },
    retry: 2,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outfits'] });
      toast.success('Outfit deleted');
    },
    onError: (error) => {
      logger.error('Failed to delete outfit', error);
      toast.error('Failed to delete outfit');
    },
  });
};
