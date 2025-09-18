import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's clothes to analyze their style preferences
    const { data: userClothes, error: clothesError } = await supabase
      .from('clothes')
      .select('category, color, style, ai_detected_metadata')
      .eq('user_id', userId);

    if (clothesError) {
      throw new Error(`Failed to fetch user clothes: ${clothesError.message}`);
    }

    if (!userClothes || userClothes.length === 0) {
      throw new Error('No clothes found for recommendations');
    }

    // Extract user's style preferences
    const userColors = [...new Set(userClothes.map(item => item.color?.toLowerCase()).filter(Boolean))];
    const userCategories = [...new Set(userClothes.map(item => item.category))];
    const userStyles = [...new Set(userClothes.map(item => item.style?.toLowerCase()).filter(Boolean))];

    console.log('User preferences:', { userColors, userCategories, userStyles });

    // Get highly-liked public outfits (lower threshold for small user base)
    const { data: popularOutfits, error: outfitsError } = await supabase
      .from('outfits')
      .select(`
        id,
        title,
        description,
        prompt,
        mood,
        generated_image_url,
        likes_count,
        ai_analysis,
        created_at,
        user_id
      `)
      .eq('is_public', true)
      .neq('user_id', userId) // Exclude user's own outfits
      .gte('likes_count', 1) // Lower threshold for testing with 1-10 users
      .order('likes_count', { ascending: false })
      .limit(50);

    if (outfitsError) {
      throw new Error(`Failed to fetch popular outfits: ${outfitsError.message}`);
    }

    if (!popularOutfits || popularOutfits.length === 0) {
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Score outfits based on user preferences
    const scoredOutfits = popularOutfits.map(outfit => {
      let score = 0;
      const outfitAnalysis = outfit.ai_analysis || {};
      
      // Base score from likes (normalized)
      score += Math.min(outfit.likes_count * 10, 50);

      // Match colors mentioned in prompt or analysis
      if (outfit.prompt) {
        const promptLower = outfit.prompt.toLowerCase();
        userColors.forEach(color => {
          if (promptLower.includes(color)) {
            score += 15;
          }
        });
      }

      // Match mood/style preferences
      if (outfit.mood && userStyles.some(style => 
        outfit.mood.toLowerCase().includes(style) || style.includes(outfit.mood.toLowerCase())
      )) {
        score += 20;
      }

      // Match categories if outfit analysis contains clothes analysis
      if (outfitAnalysis.clothes_analysis) {
        const outfitCategories = outfitAnalysis.clothes_analysis.map((item: any) => item.category);
        const categoryMatch = userCategories.filter(cat => outfitCategories.includes(cat)).length;
        score += categoryMatch * 5;
      }

      // Recent popularity boost (recency factor)
      const daysSinceCreated = (Date.now() - new Date(outfit.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated < 7) {
        score += 10; // Boost for recent popular outfits
      }

      return {
        ...outfit,
        recommendation_score: score
      };
    });

    // Sort by score and take top recommendations
    const recommendations = scoredOutfits
      .sort((a, b) => b.recommendation_score - a.recommendation_score)
      .slice(0, 10)
      .map(outfit => ({
        id: outfit.id,
        title: outfit.title,
        description: outfit.description,
        prompt: outfit.prompt,
        mood: outfit.mood,
        generated_image_url: outfit.generated_image_url,
        likes_count: outfit.likes_count,
        created_at: outfit.created_at,
        recommendation_score: outfit.recommendation_score,
        reason: generateRecommendationReason(outfit, userColors, userStyles)
      }));

    console.log(`Generated ${recommendations.length} recommendations for user ${userId}`);

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in outfit-recommendations function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateRecommendationReason(outfit: any, userColors: string[], userStyles: string[]): string {
  const reasons = [];
  
  if (outfit.likes_count >= 5) {
    reasons.push(`highly liked (${outfit.likes_count} likes)`);
  }
  
  if (outfit.prompt) {
    const promptLower = outfit.prompt.toLowerCase();
    const matchingColors = userColors.filter(color => promptLower.includes(color));
    if (matchingColors.length > 0) {
      reasons.push(`matches your ${matchingColors.join(', ')} pieces`);
    }
  }
  
  if (outfit.mood && userStyles.some(style => 
    outfit.mood.toLowerCase().includes(style) || style.includes(outfit.mood.toLowerCase())
  )) {
    reasons.push(`fits your ${outfit.mood} style`);
  }
  
  if (reasons.length === 0) {
    reasons.push('trending in the community');
  }
  
  return `Recommended because it's ${reasons.join(' and ')}`;
}