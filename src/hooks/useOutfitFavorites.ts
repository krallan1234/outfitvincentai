import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useOutfitFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('outfit_favorites')
        .select('outfit_id')
        .eq('user_id', user.id);

      if (error) throw error;

      setFavorites(data?.map(f => f.outfit_id) || []);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (outfitId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to save favorites');
        return false;
      }

      const isFavorite = favorites.includes(outfitId);

      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('outfit_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('outfit_id', outfitId);

        if (error) throw error;

        setFavorites(prev => prev.filter(id => id !== outfitId));
        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('outfit_favorites')
          .insert({
            user_id: user.id,
            outfit_id: outfitId
          });

        if (error) throw error;

        setFavorites(prev => [...prev, outfitId]);
        toast.success('Added to favorites');
      }

      return !isFavorite;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
      return false;
    }
  };

  const isFavorite = (outfitId: string): boolean => {
    return favorites.includes(outfitId);
  };

  return {
    favorites,
    loading,
    toggleFavorite,
    isFavorite,
  };
};
