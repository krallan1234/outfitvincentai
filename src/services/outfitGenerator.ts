import { outfitsApi, profilesApi } from '@/api/supabase';
import { supabase } from '@/integrations/supabase/client';
import { UserPreferences } from '@/types/generator';
import { validateColorHarmony } from '@/utils/colorTheory';

export interface ClothingItem {
  id: string;
  category: string;
  analysis?: any;
}

export interface OutfitGenerationParams {
  prompt: string;
  occasion?: string;
  weather?: any;
  pinterestPins?: any[];
  forceVariety?: boolean;
}

export interface PinterestPin {
  id: string;
  title: string;
  description: string;
  image_url: string;
  link: string;
}

/**
 * Validates that selected items don't conflict (e.g., no dress + top/bottom)
 * Also validates color harmony
 */
export function validateSelectedItems(items: any[]): { 
  isValid: boolean; 
  reason?: string 
} {
  if (!items || items.length === 0) return { isValid: true };

  const categories = items.map(item => 
    item.analysis?.main_category || item.category?.toLowerCase() || 'other'
  );
  
  const hasDress = categories.some(cat => cat.includes('dress'));
  const hasTop = categories.some(cat => cat.includes('top'));
  const hasBottom = categories.some(cat => cat.includes('bottom'));

  if (hasDress && (hasTop || hasBottom)) {
    return { isValid: false, reason: 'Cannot combine dress with top/bottom' };
  }

  // Validate color harmony if there are multiple colored items
  const colors = items
    .map(item => item.analysis?.color || item.color)
    .filter((color): color is string => !!color && color !== 'unknown');

  if (colors.length >= 2) {
    const colorValidation = validateColorHarmony(colors);
    if (!colorValidation.isValid) {
      return { isValid: false, reason: colorValidation.explanation };
    }
  }

  return { isValid: true };
}

/**
 * Enhances prompt with context like occasion and variety
 */
export function enhancePromptWithContext(
  prompt: string, 
  occasion?: string, 
  forceVariety?: boolean
): string {
  let enhanced = prompt;

  if (occasion && !enhanced.toLowerCase().includes(occasion.toLowerCase())) {
    enhanced = `${occasion}: ${enhanced}`;
  }

  if (forceVariety && !enhanced.toLowerCase().includes('different')) {
    enhanced += ' (create something different from previous outfits)';
  }

  return enhanced;
}

/**
 * Enhances search query for Pinterest with relevant keywords
 */
export function enhanceSearchQuery(prompt: string): string {
  const keywords = ['outfit', 'look', 'style', 'fashion', 'wear'];
  const hasKeyword = keywords.some(k => prompt.toLowerCase().includes(k));
  
  if (!hasKeyword) {
    return `${prompt} outfit look style`;
  }
  
  return prompt;
}

/**
 * Fetches Pinterest trends and context
 */
export async function fetchPinterestTrends(
  prompt: string
): Promise<{ context: string; pins: PinterestPin[] }> {
  try {
    const enhancedQuery = enhanceSearchQuery(prompt);
    console.log('Fetching Pinterest trends with enhanced query:', enhancedQuery);

    const { data, error } = await supabase.functions.invoke('fetch-pinterest-trends', {
      body: { query: enhancedQuery }
    });

    if (error) throw error;

    return {
      context: data?.trends_context || '',
      pins: data?.pins || []
    };
  } catch (error) {
    console.error('Pinterest trends fetch error:', error);
    return { context: '', pins: [] };
  }
}

/**
 * Generates an outfit using the API
 */
export async function generateOutfitAPI(params: {
  prompt: string;
  occasion?: string;
  weather?: any;
  selectedItems?: ClothingItem[];
  pinterestContext?: string;
  pinterestPins?: any[];
  preferences?: UserPreferences;
}) {
  return await outfitsApi.generateOutfit(params);
}

/**
 * Fetches user preferences
 */
export async function fetchUserPreferences(userId: string): Promise<UserPreferences> {
  return await profilesApi.getProfile(userId);
}
