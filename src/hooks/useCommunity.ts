import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CommunityOutfit {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  prompt: string;
  mood?: string;
  generated_image_url?: string;
  likes_count: number;
  created_at: string;
  is_liked?: boolean;
  recommended_clothes?: any;
  ai_analysis?: any;
  purchase_links?: any[];
}

export interface RecommendedOutfit extends CommunityOutfit {
  recommendation_score: number;
  reason: string;
}

export const useCommunity = () => {
  const [communityOutfits, setCommunityOutfits] = useState<CommunityOutfit[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedOutfit[]>([]);
  const [topLikedOutfits, setTopLikedOutfits] = useState<CommunityOutfit[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchCommunityOutfits = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get public outfits with likes count and ai_analysis
      const { data: outfits, error } = await supabase
        .from('outfits')
        .select(`
          id,
          user_id,
          title,
          description,
          prompt,
          mood,
          generated_image_url,
          likes_count,
          created_at,
          recommended_clothes,
          ai_analysis
        `)
        .eq('is_public', true)
        .neq('user_id', user?.id || '') // Exclude user's own outfits
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get user's likes if authenticated
      if (user) {
        const { data: likes } = await supabase
          .from('outfit_likes')
          .select('outfit_id')
          .eq('user_id', user.id);
        
        if (likes) {
          setUserLikes(new Set(likes.map(like => like.outfit_id)));
        }
      }

      // Mark outfits as liked if user has liked them
      const outfitsWithLikes = outfits?.map(outfit => ({
        ...outfit,
        is_liked: user ? userLikes.has(outfit.id) : false
      })) || [];

      setCommunityOutfits(outfitsWithLikes);
    } catch (error) {
      console.error('Error fetching community outfits:', error);
      toast({
        title: 'Error',
        description: 'Failed to load community outfits',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTopLikedOutfits = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get top 10 most liked public outfits
      const { data: outfits, error } = await supabase
        .from('outfits')
        .select(`
          id,
          user_id,
          title,
          description,
          prompt,
          mood,
          generated_image_url,
          likes_count,
          created_at,
          recommended_clothes,
          ai_analysis,
          purchase_links
        `)
        .eq('is_public', true)
        .gt('likes_count', 0)
        .order('likes_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Mark outfits as liked if user has liked them
      const outfitsWithLikes = outfits?.map(outfit => ({
        ...outfit,
        purchase_links: Array.isArray(outfit.purchase_links) ? outfit.purchase_links : [],
        is_liked: user ? userLikes.has(outfit.id) : false
      })) as CommunityOutfit[] || [];

      setTopLikedOutfits(outfitsWithLikes);
    } catch (error) {
      console.error('Error fetching top liked outfits:', error);
      toast({
        title: 'Error',
        description: 'Failed to load top liked outfits',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('outfit-recommendations', {
        body: { userId: user.id },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      // Don't show error toast for recommendations as it's not critical
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (outfitId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'Please log in to like outfits',
          variant: 'destructive',
        });
        return;
      }

      const isCurrentlyLiked = userLikes.has(outfitId);

      if (isCurrentlyLiked) {
        // Unlike
        const { error } = await supabase
          .from('outfit_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('outfit_id', outfitId);

        if (error) throw error;

        setUserLikes(prev => {
          const newSet = new Set(prev);
          newSet.delete(outfitId);
          return newSet;
        });

        // Update local state
        setCommunityOutfits(prev => prev.map(outfit => 
          outfit.id === outfitId 
            ? { ...outfit, likes_count: outfit.likes_count - 1, is_liked: false }
            : outfit
        ));
      } else {
        // Like
        const { error } = await supabase
          .from('outfit_likes')
          .insert({
            user_id: user.id,
            outfit_id: outfitId
          });

        if (error) throw error;

        setUserLikes(prev => new Set([...prev, outfitId]));

        // Update local state
        setCommunityOutfits(prev => prev.map(outfit => 
          outfit.id === outfitId 
            ? { ...outfit, likes_count: outfit.likes_count + 1, is_liked: true }
            : outfit
        ));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: 'Error',
        description: 'Failed to update like',
        variant: 'destructive',
      });
    }
  };

  const updateOutfitPrivacy = async (outfitId: string, isPublic: boolean) => {
    try {
      const { error } = await supabase
        .from('outfits')
        .update({ is_public: isPublic })
        .eq('id', outfitId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Outfit ${isPublic ? 'shared publicly' : 'made private'}`,
      });
    } catch (error) {
      console.error('Error updating outfit privacy:', error);
      toast({
        title: 'Error',
        description: 'Failed to update outfit privacy',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchCommunityOutfits();
    fetchTopLikedOutfits();
  }, []);

  return {
    communityOutfits,
    recommendations,
    topLikedOutfits,
    loading,
    userLikes,
    toggleLike,
    updateOutfitPrivacy,
    fetchRecommendations,
    fetchTopLikedOutfits,
    refetch: fetchCommunityOutfits,
  };
};