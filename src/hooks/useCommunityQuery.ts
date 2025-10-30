import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communityApi } from '@/api/supabase';
import { CommentSchema } from '@/lib/validations';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export const useCommunityOutfitsQuery = (limit = 20) => {
  return useQuery({
    queryKey: ['community', 'outfits', limit],
    queryFn: async () => {
      const outfits = await communityApi.fetchCommunityOutfits(limit);
      logger.info('Community outfits fetched', { count: outfits.length });
      return outfits;
    },
    staleTime: 1000 * 60 * 1, // 1 minute
    retry: 2,
  });
};

export const useToggleLike = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (outfitId: string) => {
      if (!userId) throw new Error('User ID required');
      const isLiked = await communityApi.toggleLike(userId, outfitId);
      logger.info('Like toggled', { outfitId, isLiked });
      return isLiked;
    },
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community'] });
    },
    onError: (error) => {
      logger.error('Failed to toggle like', error);
      toast.error('Failed to update like');
    },
  });
};

export const useCommentsQuery = (outfitId: string) => {
  return useQuery({
    queryKey: ['comments', outfitId],
    queryFn: async () => {
      const comments = await communityApi.fetchComments(outfitId);
      logger.info('Comments fetched', { count: comments.length });
      return comments;
    },
    staleTime: 1000 * 30, // 30 seconds
    retry: 2,
  });
};

export const useAddComment = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { outfitId: string; content: string }) => {
      if (!userId) throw new Error('User ID required');
      const validated = CommentSchema.parse(input);
      const comment = await communityApi.addComment(
        userId,
        validated.outfitId,
        validated.content
      );
      logger.info('Comment added', { commentId: comment.id });
      return comment;
    },
    retry: 2,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.outfitId] });
      toast.success('Comment added');
    },
    onError: (error) => {
      logger.error('Failed to add comment', error);
      toast.error('Failed to add comment');
    },
  });
};
