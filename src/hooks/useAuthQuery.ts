import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/supabase';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export const useAuthQuery = () => {
  return useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      const user = await authApi.getUser();
      logger.info('User fetched', { userId: user?.id });
      return user;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
};

export const useSignOut = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.signOut,
    onSuccess: () => {
      queryClient.clear();
      logger.info('User signed out');
      toast.success('Signed out successfully');
    },
    onError: (error) => {
      logger.error('Sign out failed', error);
      toast.error('Failed to sign out');
    },
  });
};
