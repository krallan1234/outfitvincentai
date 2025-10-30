import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clothesApi } from '@/api/supabase';
import { ClothingUploadSchema } from '@/lib/validations';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export const useClothesQuery = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['clothes', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      const clothes = await clothesApi.fetchClothes(userId);
      logger.info('Clothes fetched', { count: clothes.length });
      return clothes;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
};

export const useUploadClothing = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { file: File; category?: string }) => {
      if (!userId) throw new Error('User ID required');
      const validated = ClothingUploadSchema.parse(input);
      const result = await clothesApi.uploadClothingImage(userId, validated.file);
      logger.info('Clothing uploaded', { fileName: result.fileName });
      return result;
    },
    retry: 2,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clothes', userId] });
      toast.success('Clothing item uploaded');
    },
    onError: (error) => {
      logger.error('Failed to upload clothing', error);
      toast.error('Failed to upload clothing item');
    },
  });
};

export const useDeleteClothing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, imagePath }: { id: string; imagePath?: string }) => {
      await clothesApi.deleteClothingItem(id, imagePath);
      logger.info('Clothing deleted', { id });
    },
    retry: 2,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clothes'] });
      toast.success('Item deleted');
    },
    onError: (error) => {
      logger.error('Failed to delete clothing', error);
      toast.error('Failed to delete item');
    },
  });
};
