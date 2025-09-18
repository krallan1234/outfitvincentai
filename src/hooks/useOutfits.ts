import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Outfit {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  mood?: string;
  generated_image_url?: string;
  description?: string;
  recommended_clothes?: any;
  ai_analysis?: any;
  is_public?: boolean;
  likes_count?: number;
  created_at: string;
  updated_at: string;
}

export const useOutfits = () => {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchOutfits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('outfits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOutfits(data || []);
    } catch (error) {
      console.error('Error fetching outfits:', error);
      toast({
        title: 'Error',
        description: 'Failed to load outfits',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateOutfit = async (prompt: string, mood?: string) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('generate-outfit', {
        body: {
          prompt,
          mood,
          userId: user.id
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      // Add the new outfit to the list
      setOutfits(prev => [data.outfit, ...prev]);
      
      toast({
        title: 'Success',
        description: 'Outfit generated successfully!',
      });

      return {
        outfit: data.outfit,
        recommendedClothes: data.recommendedClothes
      };
    } catch (error) {
      console.error('Error generating outfit:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate outfit';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteOutfit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('outfits')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setOutfits(prev => prev.filter(outfit => outfit.id !== id));
      toast({
        title: 'Success',
        description: 'Outfit deleted',
      });
    } catch (error) {
      console.error('Error deleting outfit:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete outfit',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchOutfits();
  }, []);

  return {
    outfits,
    loading,
    generateOutfit,
    deleteOutfit,
    refetch: fetchOutfits,
  };
};