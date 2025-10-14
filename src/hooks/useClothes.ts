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

      // Check current item count before upload
      const { data: existingClothes, error: countError } = await supabase
        .from('clothes')
        .select('id')
        .eq('user_id', user.id);

      if (countError) throw countError;
      
      if (existingClothes && existingClothes.length >= 100) {
        throw new Error("You've reached the maximum of 100 clothes items. Delete some to add more.");
      }

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

      // Only use AI for color detection if color is not manually provided
      let aiDetectedColor = null;
      if (!metadata.color) {
        try {
          const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-clothing', {
            body: { imageBase64 },
          });
          
          if (!analysisError && analysisData?.analysis?.color) {
            aiDetectedColor = analysisData.analysis.color;
          }
        } catch (aiError) {
          console.warn('AI color detection failed, continuing without color:', aiError);
        }
      }

      // Sanitize filename to prevent storage errors
      const sanitizedFileName = file.name
        .replace(/[åäöÅÄÖ]/g, (char) => ({
          'å': 'a', 'ä': 'a', 'ö': 'o',
          'Å': 'A', 'Ä': 'A', 'Ö': 'O'
        }[char] || char))
        .replace(/[^a-zA-Z0-9.-]/g, '_');
      
      const fileName = `${user.id}/${Date.now()}_${sanitizedFileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('clothes')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('clothes')
        .getPublicUrl(fileName);

      // Save to database with manual metadata and AI-detected color
      const finalMetadata = {
        ...metadata,
        color: metadata.color || aiDetectedColor || 'unknown',
      };

      const { data: clothingData, error: dbError } = await supabase
        .from('clothes')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          ...finalMetadata,
          ai_detected_metadata: aiDetectedColor ? { color: aiDetectedColor } : null,
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
      
      let errorMessage = 'Failed to upload clothing item';
      if (error instanceof Error) {
        if (error.message.includes('InvalidKey')) {
          errorMessage = 'Invalid filename. Please try renaming your image file.';
        } else if (error.message.includes('quota exceeded')) {
          errorMessage = 'AI analysis quota exceeded. Upload will continue without AI analysis.';
        } else if (error.message.includes('Upload failed')) {
          errorMessage = error.message;
        }
      }
      
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