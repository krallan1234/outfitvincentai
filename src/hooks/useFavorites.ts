import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export const useFavorites = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadFavorites();
    }
  }, [user?.id]);

  const loadFavorites = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('outfit_likes')
        .select('outfit_id')
        .eq('user_id', user.id);

      if (error) throw error;
      
      setFavorites(new Set(data.map(like => like.outfit_id)));
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  };

  const toggleFavorite = async (outfitId: string): Promise<boolean> => {
    if (!user?.id) {
      toast.error('Please sign in to save favorites');
      return false;
    }

    setLoading(true);
    const isFavorited = favorites.has(outfitId);

    try {
      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('outfit_likes')
          .delete()
          .eq('outfit_id', outfitId)
          .eq('user_id', user.id);

        if (error) throw error;

        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(outfitId);
          return next;
        });

        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('outfit_likes')
          .insert({
            outfit_id: outfitId,
            user_id: user.id,
          });

        if (error) throw error;

        setFavorites(prev => new Set(prev).add(outfitId));
        toast.success('❤️ Added to favorites!');
      }

      // Invalidate queries to refresh counts
      queryClient.invalidateQueries({ queryKey: ['outfits'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });

      return true;
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toast.error('Failed to update favorite');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const isFavorited = (outfitId: string) => favorites.has(outfitId);

  return {
    favorites,
    isFavorited,
    toggleFavorite,
    loading,
  };
};
