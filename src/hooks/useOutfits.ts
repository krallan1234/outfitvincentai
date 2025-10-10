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
  purchase_links?: any[];
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('outfits')
        .select('*')
        .eq('user_id', user.id) // Filter by current user's ID
        .order('created_at', { ascending: false });

      if (error) throw error;
      const outfitsWithLinks = data?.map(outfit => ({
        ...outfit,
        purchase_links: Array.isArray(outfit.purchase_links) ? outfit.purchase_links : []
      })) as Outfit[] || [];
      setOutfits(outfitsWithLinks);
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

  const generateOutfit = async (
    prompt: string, 
    mood?: string, 
    isPublic: boolean = true, 
    pinterestBoardId?: string,
    selectedItem?: any | any[],
    purchaseLinks?: any[],
    weatherData?: any,
    userPreferences?: any
  ) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('generate-outfit', {
        body: {
          prompt,
          mood,
          userId: user.id,
          isPublic,
          pinterestBoardId,
          selectedItem,
          purchaseLinks,
          weatherData,
          userPreferences
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
      
      // Extract user-friendly error messages
      let errorMessage = 'Failed to generate outfit';
      
      if (error instanceof Error) {
        // Check for specific error patterns
        if (error.message.includes('overloaded') || error.message.includes('503')) {
          errorMessage = 'AI service is currently busy. Please try again in a few moments.';
        } else if (error.message.includes('Rate limit') || error.message.includes('429')) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (error.message.includes('authentication') || error.message.includes('401')) {
          errorMessage = 'Service configuration issue. Please contact support.';
        } else if (error.message.includes('No clothes found')) {
          errorMessage = 'Please upload some clothing items to your wardrobe first.';
        } else if (error.message.includes('connection') || error.message.includes('network')) {
          errorMessage = 'Connection issue. Please check your internet and try again.';
        } else {
          // Use the error message if it's user-friendly
          errorMessage = error.message;
        }
      }
      
      toast({
        title: 'Generation Failed',
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