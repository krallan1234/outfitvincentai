import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profilesApi } from '@/api/supabase';
import { UserPreferencesUpdateSchema } from '@/lib/validations';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export const useUserPreferencesQuery = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['preferences', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      const prefs = await profilesApi.getProfile(userId);
      logger.info('Preferences loaded', { userId });
      return prefs;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
};

export const useUpdatePreferences = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!userId) throw new Error('User ID required');
      const validated = UserPreferencesUpdateSchema.parse(updates);
      await profilesApi.updateProfile(userId, validated);
      logger.info('Preferences updated', { userId });
      return validated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences', userId] });
      toast.success('Preferences updated');
    },
    onError: (error) => {
      logger.error('Failed to update preferences', error);
      toast.error('Failed to update preferences');
    },
  });
};
