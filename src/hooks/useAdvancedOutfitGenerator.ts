import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Outfit } from '@/hooks/useOutfits';

export interface ConfidenceBreakdown {
  styleMatch: number;
  weatherAppropriateness: number;
  colorHarmony: number;
  trendRelevance: number;
}

export interface AdvancedOutfit {
  id: string;
  outfit: Outfit;
  confidenceScore: number;
  confidenceBreakdown: ConfidenceBreakdown;
  stylingTips: string[];
  weatherNotes: string;
  trendAnalysis: string;
  userFeedback?: 'like' | 'dislike' | null;
}

export interface GenerationParams {
  prompt: string;
  occasion?: string;
  mood?: string;
  weather?: any;
  userPreferences?: any;
  forceVariety?: boolean;
}

const calculateOverallScore = (factors: ConfidenceBreakdown): number => {
  const weights = {
    styleMatch: 0.35,
    weatherAppropriateness: 0.25,
    colorHarmony: 0.25,
    trendRelevance: 0.15
  };
  
  return (
    factors.styleMatch * weights.styleMatch +
    factors.weatherAppropriateness * weights.weatherAppropriateness +
    factors.colorHarmony * weights.colorHarmony +
    factors.trendRelevance * weights.trendRelevance
  );
};

export const useAdvancedOutfitGenerator = () => {
  const [outfits, setOutfits] = useState<AdvancedOutfit[]>([]);
  const [loading, setLoading] = useState(false);

  const generateMultiple = async (params: GenerationParams) => {
    setLoading(true);
    
    try {
      console.log('Generating 5 unique outfits with params:', params);
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('User not authenticated');
      }

      // Call generate-outfit edge function with multiGeneration flag
      const { data, error } = await supabase.functions.invoke('generate-outfit', {
        body: {
          ...params,
          userId: userData.user.id,
          isPublic: true,
          generateMultiple: true,
          count: 5
        }
      });

      if (error) {
        console.error('Generation error:', error);
        throw error;
      }

      console.log('Raw generation result:', data);

      // Process the results
      const processedOutfits: AdvancedOutfit[] = (data.outfits || [data]).map((outfitData: any, index: number) => {
        const confidenceFactors = outfitData.confidence_factors || {
          styleMatch: 8.0,
          weatherAppropriateness: 8.0,
          colorHarmony: 8.0,
          trendRelevance: 7.5
        };
        
        const confidenceScore = outfitData.confidence_score || calculateOverallScore(confidenceFactors);
        
        return {
          id: outfitData.id || `outfit-${index}`,
          outfit: outfitData,
          confidenceScore,
          confidenceBreakdown: confidenceFactors,
          stylingTips: Array.isArray(outfitData.styling_tips) 
            ? outfitData.styling_tips 
            : (outfitData.styling_tips ? [outfitData.styling_tips] : [
                'Mix textures for visual interest',
                'Balance proportions for a flattering silhouette',
                'Add a statement accessory'
              ]),
          weatherNotes: outfitData.weather_notes || 'Suitable for current weather conditions',
          trendAnalysis: outfitData.trend_analysis || 'Contemporary style based on current trends',
          userFeedback: null
        };
      });

      setOutfits(processedOutfits);
      toast.success(`${processedOutfits.length} unique outfits generated!`);
      
    } catch (error) {
      console.error('Failed to generate outfits:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate outfits');
    } finally {
      setLoading(false);
    }
  };

  const saveFeedback = async (outfitId: string, type: 'like' | 'dislike') => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('User not authenticated');
      }

      const outfit = outfits.find(o => o.id === outfitId);
      
      const { error } = await supabase.functions.invoke('save-outfit-feedback', {
        body: {
          userId: userData.user.id,
          outfitId,
          feedbackType: type,
          confidenceScore: outfit?.confidenceScore,
          styleContext: outfit ? {
            mood: outfit.outfit.mood,
            prompt: outfit.outfit.prompt
          } : null
        }
      });

      if (error) throw error;

      // Update local state
      setOutfits(prev => 
        prev.map(o => o.id === outfitId ? { ...o, userFeedback: type } : o)
      );

      toast.success(type === 'like' ? '❤️ Outfit liked!' : '👍 Feedback saved');
      
    } catch (error) {
      console.error('Failed to save feedback:', error);
      toast.error('Failed to save feedback');
    }
  };

  return {
    outfits,
    loading,
    generateMultiple,
    saveFeedback
  };
};
