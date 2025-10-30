import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useRealtimeOutfits = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    console.log('[Realtime] Setting up outfit updates channel...');

    const channel = supabase
      .channel('outfit-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'outfits',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Realtime] New outfit created:', payload);
          toast.success('🎉 New outfit generated!');
          queryClient.invalidateQueries({ queryKey: ['outfits'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'outfits',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Realtime] Outfit updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['outfits'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'outfits',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Realtime] Outfit deleted:', payload);
          toast.info('Outfit removed');
          queryClient.invalidateQueries({ queryKey: ['outfits'] });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    return () => {
      console.log('[Realtime] Cleaning up outfit updates channel');
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
};
