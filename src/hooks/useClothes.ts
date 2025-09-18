import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ClothingItem {
  id: string;
  user_id: string;
  image_url: string;
  category: string;
  color?: string;
  style?: string;
  brand?: string;
  description?: string;
  ai_detected_metadata?: any;
  created_at: string;
  updated_at: string;
}

export const useClothes = () => {
  const [clothes, setClothes] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchClothes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clothes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClothes(data || []);
    } catch (error) {
      console.error('Error fetching clothes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load clothes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadClothing = async (file: File, metadata: {
    category: string;
    color?: string;
    style?: string;
    brand?: string;
    description?: string;
  }) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Convert image to base64 for AI analysis
      const reader = new FileReader();
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:image/jpeg;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Analyze image with AI
      let aiAnalysis = null;
      try {
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-clothing', {
          body: { imageBase64 },
        });
        
        if (!analysisError && analysisData?.analysis) {
          aiAnalysis = analysisData.analysis;
        }
      } catch (aiError) {
        console.warn('AI analysis failed, continuing with manual metadata:', aiError);
      }

      // Upload image to storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('clothes')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('clothes')
        .getPublicUrl(fileName);

      // Save to database with merged metadata
      const finalMetadata = {
        ...metadata,
        ...(aiAnalysis && {
          category: aiAnalysis.category || metadata.category,
          color: aiAnalysis.color || metadata.color,
          style: aiAnalysis.style || metadata.style,
          brand: aiAnalysis.brand || metadata.brand,
          description: aiAnalysis.description || metadata.description,
        })
      };

      const { data: clothingData, error: dbError } = await supabase
        .from('clothes')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          ...finalMetadata,
          ai_detected_metadata: aiAnalysis,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setClothes(prev => [clothingData, ...prev]);
      toast({
        title: 'Success',
        description: 'Clothing item uploaded successfully',
      });

      return clothingData;
    } catch (error) {
      console.error('Error uploading clothing:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload clothing item',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteClothing = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clothes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setClothes(prev => prev.filter(item => item.id !== id));
      toast({
        title: 'Success',
        description: 'Clothing item deleted',
      });
    } catch (error) {
      console.error('Error deleting clothing:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete clothing item',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchClothes();
  }, []);

  return {
    clothes,
    loading,
    uploadClothing,
    deleteClothing,
    refetch: fetchClothes,
  };
};