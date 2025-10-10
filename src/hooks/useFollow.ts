import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useFollow = () => {
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchFollowing = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (error) throw error;

      setFollowing(new Set(data?.map(f => f.following_id) || []));
    } catch (error) {
      console.error('Error fetching following:', error);
    }
  };

  const toggleFollow = async (userId: string) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'Please log in to follow users',
          variant: 'destructive',
        });
        return;
      }

      if (user.id === userId) {
        toast({
          title: 'Error',
          description: 'You cannot follow yourself',
          variant: 'destructive',
        });
        return;
      }

      const isFollowing = following.has(userId);

      if (isFollowing) {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        if (error) throw error;

        setFollowing(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });

        toast({
          title: 'Success',
          description: 'Unfollowed user',
        });
      } else {
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: userId
          });

        if (error) throw error;

        setFollowing(prev => new Set([...prev, userId]));

        toast({
          title: 'Success',
          description: 'Now following user',
        });
      }

      await fetchFollowing();
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        title: 'Error',
        description: 'Failed to update follow status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowing();
  }, []);

  return {
    following,
    loading,
    toggleFollow,
    isFollowing: (userId: string) => following.has(userId),
    refetch: fetchFollowing
  };
};
