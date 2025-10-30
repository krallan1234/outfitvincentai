import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { followApi } from '@/api/supabase';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export const useFollowingQuery = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['following', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      const following = await followApi.fetchFollowing(userId);
      logger.info('Following list fetched', { count: following.length });
      return new Set(following);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
};

export const useToggleFollow = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!userId) throw new Error('User ID required');
      if (userId === targetUserId) throw new Error('Cannot follow yourself');

      const isFollowing = await followApi.toggleFollow(userId, targetUserId);
      logger.info('Follow toggled', { targetUserId, isFollowing });
      return isFollowing;
    },
    retry: 1,
    onSuccess: (isFollowing) => {
      queryClient.invalidateQueries({ queryKey: ['following', userId] });
      toast.success(isFollowing ? 'Followed' : 'Unfollowed');
    },
    onError: (error) => {
      logger.error('Failed to toggle follow', error);
      toast.error('Failed to update follow status');
    },
  });
};
