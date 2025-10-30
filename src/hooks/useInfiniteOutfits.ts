import { useInfiniteQuery } from '@tanstack/react-query';
import { outfitsApi } from '@/api/supabase';
import { logger } from '@/lib/logger';

const PAGE_SIZE = 20;

export const useInfiniteOutfits = (userId: string | undefined) => {
  return useInfiniteQuery({
    queryKey: ['outfits', 'infinite', userId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) throw new Error('User ID required');

      // This is a simplified version - you'd need to modify outfitsApi to support pagination
      const outfits = await outfitsApi.fetchOutfits(userId);

      // Simulate pagination
      const start = pageParam * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      const page = outfits.slice(start, end);

      logger.info('Infinite outfits page fetched', {
        page: pageParam,
        count: page.length,
        hasMore: end < outfits.length,
      });

      return {
        outfits: page,
        nextCursor: end < outfits.length ? pageParam + 1 : undefined,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
