import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOutfits } from '@/hooks/useOutfits';
import {
  OutfitGenerationParams,
  OutfitGenerationResult,
  GenerationState,
  PinterestPin,
} from '@/types/generator';
import { ClothingItem } from '@/types/outfit';

const GENERATION_TIPS = [
  'Analyzing your wardrobe selections...',
  'Finding perfect color combinations...',
  'Checking Pinterest trends for inspiration...',
  'Considering weather conditions...',
  'Finalizing your outfit with AI...',
] as const;

export const useOutfitGeneration = () => {
  const [state, setState] = useState<GenerationState>({
    loading: false,
    step: 1,
    tip: '',
    error: null,
  });

  const { generateOutfit: generateOutfitAPI } = useOutfits();
  const { toast } = useToast();

  const validateSelectedItems = (items: ClothingItem[]): boolean => {
    if (items.length === 0) return true;

    const categories = items.map((item) => item.category.toLowerCase());

    const topCategories = categories.filter((cat) =>
      cat.includes('top') ||
      cat.includes('shirt') ||
      cat.includes('blouse') ||
      cat.includes('sweater') ||
      cat.includes('t-shirt') ||
      cat.includes('tank')
    );

    const bottomCategories = categories.filter((cat) =>
      cat.includes('bottom') ||
      cat.includes('pants') ||
      cat.includes('jeans') ||
      cat.includes('skirt') ||
      cat.includes('shorts') ||
      cat.includes('trousers')
    );

    const dressCategories = categories.filter((cat) =>
      cat.includes('dress') || cat.includes('jumpsuit')
    );

    if (topCategories.length > 1) {
      toast({
        title: 'Selection Conflict',
        description: 'You can only select one top item. Please remove duplicate tops.',
        variant: 'destructive',
      });
      return false;
    }

    if (bottomCategories.length > 1) {
      toast({
        title: 'Selection Conflict',
        description:
          'You can only select one bottom item. Please remove duplicate bottoms.',
        variant: 'destructive',
      });
      return false;
    }

    if (dressCategories.length > 1) {
      toast({
        title: 'Selection Conflict',
        description: 'You can only select one dress. Please remove duplicates.',
        variant: 'destructive',
      });
      return false;
    }

    if (
      dressCategories.length > 0 &&
      (topCategories.length > 0 || bottomCategories.length > 0)
    ) {
      toast({
        title: 'Selection Conflict',
        description:
          'Cannot select a dress with tops or bottoms. Choose either a dress OR top+bottom combination.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const enhancePromptWithContext = (
    prompt: string,
    occasion?: string,
    forceVariety?: boolean
  ): string => {
    let enhancedPrompt = occasion ? `${prompt} for ${occasion}` : prompt;

    if (forceVariety) {
      enhancedPrompt += ` (style variation ${Math.floor(Math.random() * 10000)})`;
    }

    return enhancedPrompt;
  };

  const enhanceSearchQuery = (prompt: string): string => {
    const lowerPrompt = prompt.toLowerCase();
    let enhancement = '';

    if (
      lowerPrompt.includes('business') ||
      lowerPrompt.includes('meeting') ||
      lowerPrompt.includes('office')
    ) {
      enhancement = ' professional office business attire formal workwear';
    } else if (
      lowerPrompt.includes('formal') ||
      lowerPrompt.includes('elegant') ||
      lowerPrompt.includes('gala')
    ) {
      enhancement = ' formal elegant evening wear sophisticated';
    } else if (
      lowerPrompt.includes('athletic') ||
      lowerPrompt.includes('gym') ||
      lowerPrompt.includes('sporty')
    ) {
      enhancement = ' athletic activewear sportswear fitness gym';
    } else if (lowerPrompt.includes('date') || lowerPrompt.includes('romantic')) {
      enhancement = ' date night romantic dinner outfit stylish';
    } else if (lowerPrompt.includes('street') || lowerPrompt.includes('urban')) {
      enhancement = ' streetwear urban fashion trendy cool';
    } else if (lowerPrompt.includes('casual') || lowerPrompt.includes('weekend')) {
      enhancement = ' casual comfortable relaxed everyday style';
    }

    return prompt + enhancement;
  };

  const fetchPinterestTrends = async (
    prompt: string
  ): Promise<{ context: string; pins: PinterestPin[] }> => {
    try {
      const enhancedQuery = enhanceSearchQuery(prompt);
      console.log('Fetching Pinterest trends with enhanced query:', enhancedQuery);

      const trendsResponse = await supabase.functions.invoke('fetch-pinterest-trends', {
        body: { query: enhancedQuery, limit: 20 },
      });

      if (trendsResponse.data && !trendsResponse.error) {
        return {
          context: trendsResponse.data.ai_context || '',
          pins: trendsResponse.data.top_pins || [],
        };
      }
    } catch (err) {
      console.warn('Failed to fetch Pinterest trends, continuing without:', err);
    }

    return { context: '', pins: [] };
  };

  const startGenerationProgress = (hasWeather: boolean): NodeJS.Timeout => {
    let tipIndex = 0;
    const tips = hasWeather
      ? GENERATION_TIPS
      : GENERATION_TIPS.filter((tip) => !tip.includes('weather'));

    setState((prev) => ({ ...prev, step: 1, tip: tips[0] }));

    return setInterval(() => {
      tipIndex++;
      setState((prev) => ({
        ...prev,
        step: Math.min(tipIndex + 1, 4),
        tip: tips[tipIndex % tips.length],
      }));
    }, 3000);
  };

  const generate = async (
    params: OutfitGenerationParams,
    selectedItems: ClothingItem[] = []
  ): Promise<OutfitGenerationResult | null> => {
    if (!params.prompt.trim()) {
      toast({
        title: 'Missing Prompt',
        description: 'Please describe the outfit you want to generate.',
        variant: 'destructive',
      });
      return null;
    }

    // Validate selected items
    if (!validateSelectedItems(selectedItems)) {
      return null;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    const progressInterval = startGenerationProgress(!!params.weather);

    try {
      // Fetch user preferences
      const { data: { user } } = await supabase.auth.getUser();
      let userPreferences = params.userPreferences;

      if (!userPreferences && user) {
        const { data } = await supabase
          .from('profiles')
          .select('body_type, style_preferences, favorite_colors')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          userPreferences = {
            body_type: data.body_type || undefined,
            style_preferences: typeof data.style_preferences === 'string' 
              ? data.style_preferences 
              : JSON.stringify(data.style_preferences),
            favorite_colors: typeof data.favorite_colors === 'string'
              ? data.favorite_colors
              : JSON.stringify(data.favorite_colors),
          };
        }
      }

      // Enhance prompt with context
      const enhancedPrompt = enhancePromptWithContext(
        params.prompt,
        params.occasion,
        params.forceVariety
      );

      // Fetch Pinterest trends
      const { context: pinterestContext, pins: pinterestPins } =
        await fetchPinterestTrends(enhancedPrompt);

      // Generate outfit
      const result = await generateOutfitAPI(
        enhancedPrompt,
        params.mood,
        params.isPublic !== false,
        params.pinterestBoardId,
        selectedItems.length > 0 ? selectedItems : undefined,
        params.purchaseLinks,
        params.weather,
        userPreferences,
        pinterestContext,
        pinterestPins,
        params.shouldGenerateImage
      );

      console.log('✅ Outfit generation API result:', {
        hasOutfit: !!result?.outfit,
        outfitId: result?.outfit?.id,
        outfitTitle: result?.outfit?.title,
        hasRecommendedClothes: !!result?.recommendedClothes,
        recommendedClothesCount: result?.recommendedClothes?.length,
        fromCache: (result as any)?.fromCache,
        fullResult: result
      });

      setState((prev) => ({ ...prev, loading: false, step: 1, tip: '' }));
      clearInterval(progressInterval);

      // Show cache notification if result came from cache
      if (result && (result as any).fromCache) {
        toast({
          title: '⚡ Instant Result',
          description: 'This outfit was retrieved from cache - no AI cost incurred!',
          duration: 3000,
        });
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to generate outfit';
      
      setState((prev) => ({
        ...prev,
        loading: false,
        step: 1,
        tip: '',
        error: errorMessage,
      }));

      clearInterval(progressInterval);

      toast({
        title: 'Generation Failed',
        description: errorMessage,
        variant: 'destructive',
      });

      return null;
    }
  };

  return {
    ...state,
    generate,
  };
};
