import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
const pinterestApiKey = Deno.env.get('PINTEREST_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, mood, userId } = await req.json();

    if (!prompt || !userId) {
      throw new Error('Prompt and userId are required');
    }

    if (!geminiApiKey) {
      throw new Error('Google Gemini API key not configured');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's clothes
    const { data: clothes, error: clothesError } = await supabase
      .from('clothes')
      .select('*')
      .eq('user_id', userId);

    if (clothesError) {
      throw new Error(`Failed to fetch clothes: ${clothesError.message}`);
    }

    if (!clothes || clothes.length === 0) {
      throw new Error('No clothes found. Please upload some clothing items first.');
    }

    console.log(`Analyzing ${clothes.length} clothing items for outfit generation`);

    // Prepare clothes analysis with fallback to existing metadata
    console.log('Preparing clothes analysis...');
    const clothesAnalysis = clothes.slice(0, 10).map((item) => {
      // Use existing metadata as fallback, enhanced with AI data if available
      const fallbackAnalysis = {
        category: item.category,
        color: item.color || 'neutral',
        style: item.style || 'casual',
        formality: item.style === 'formal' ? 'formal' : item.style === 'business' ? 'semi-formal' : 'casual',
        season: 'all',
        versatility: 7
      };

      // Check if we have AI analysis from previous uploads
      let analysis = fallbackAnalysis;
      if (item.ai_detected_metadata) {
        try {
          const aiData = typeof item.ai_detected_metadata === 'string' 
            ? JSON.parse(item.ai_detected_metadata) 
            : item.ai_detected_metadata;
          
          if (aiData && typeof aiData === 'object') {
            analysis = {
              category: aiData.category || fallbackAnalysis.category,
              color: aiData.color || fallbackAnalysis.color,
              style: aiData.style || fallbackAnalysis.style,
              formality: aiData.formality || fallbackAnalysis.formality,
              season: aiData.season || fallbackAnalysis.season,
              versatility: aiData.versatility || fallbackAnalysis.versatility
            };
          }
        } catch (error) {
          console.warn(`Failed to parse AI metadata for item ${item.id}:`, error);
          analysis = fallbackAnalysis;
        }
      }

      return {
        ...item,
        analysis
      };
    });

    const validClothes = clothesAnalysis.filter(item => item !== null);

    // Step 1: Get Pinterest trends for inspiration (1st API call)
    let pinterestTrends = [];
    if (pinterestApiKey) {
      try {
        const pinterestQuery = `${prompt} ${mood || ''} outfit style`.trim();
        const pinterestResponse = await fetch(`https://api.pinterest.com/v5/search/pins/?query=${encodeURIComponent(pinterestQuery)}&limit=5`, {
          headers: {
            'Authorization': `Bearer ${pinterestApiKey}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (pinterestResponse.ok) {
          const pinterestData = await pinterestResponse.json();
          pinterestTrends = pinterestData.items?.slice(0, 3) || [];
          console.log(`Found ${pinterestTrends.length} Pinterest inspiration items`);
        }
      } catch (error) {
        console.warn('Pinterest API failed, continuing without trends:', error);
      }
    }

    // Step 2: Use Gemini to generate outfit recommendations (2nd API call)
    const outfitPrompt = `
      You are a professional fashion stylist. Create an outfit recommendation based on:
      
      AVAILABLE CLOTHES: ${JSON.stringify(validClothes.map(item => ({
        id: item.id,
        category: item.category,
        color: item.analysis.color,
        style: item.analysis.style
      })))}
      
      USER REQUEST: "${prompt}" ${mood ? `with a ${mood} mood` : ''}
      
      PINTEREST TRENDS: ${pinterestTrends.length > 0 ? 
        pinterestTrends.map(trend => trend.description || 'trending style').join(', ') : 
        'classic styling'}
      
      INSTRUCTIONS:
      1. Select 3-5 clothing items that work well together
      2. Consider color harmony (complementary, analogous, or monochromatic schemes)
      3. Match the requested mood and incorporate Pinterest trends
      4. Ensure the outfit is practical and stylish
      
      Return a JSON object with:
      {
        "title": "Creative outfit name",
        "description": "2-3 sentence description of the outfit and why it works",
        "recommended_items": ["item_id_1", "item_id_2", "item_id_3"],
        "styling_tips": ["tip1", "tip2", "tip3"],
        "color_harmony": "description of color scheme used",
        "occasion": "best occasions for this outfit"
      }
    `;

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: outfitPrompt
          }]
        }],
        generationConfig: {
          maxOutputTokens: 800,
          temperature: 0.7
        }
      }),
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorData);
      
      if (geminiResponse.status === 429) {
        throw new Error('Gemini quota exceeded. Please try again later or contact support.');
      } else if (geminiResponse.status === 401) {
        throw new Error('Gemini API authentication failed. Please check your API key.');
      } else {
        throw new Error(`Gemini API error (${geminiResponse.status}): Failed to generate outfit recommendation`);
      }
    }

    const geminiData = await geminiResponse.json();
    const content = geminiData.candidates[0].content.parts[0].text;
    
    // Log raw response for debugging
    console.log('Raw Gemini response:', content);
    
    // Parse JSON from potentially markdown-wrapped response
    let outfitRecommendation;
    try {
      // Try to extract JSON from markdown code blocks first
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        console.log('Found markdown-wrapped JSON, extracting...');
        outfitRecommendation = JSON.parse(jsonMatch[1].trim());
      } else {
        // Fallback to direct parsing
        console.log('No markdown wrapper found, parsing directly...');
        outfitRecommendation = JSON.parse(content.trim());
      }
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Content that failed to parse:', content);
      throw new Error('Invalid JSON response from AI. Please try again with a different request.');
    }

    // Generate outfit visualization description (no additional API calls)
    const selectedItems = validClothes.filter(item => 
      outfitRecommendation.recommended_items.includes(item.id)
    );
    
    const outfitVisualization = {
      items: selectedItems.map(item => ({
        id: item.id,
        category: item.category,
        color: item.analysis.color,
        image_url: item.image_url
      })),
      description: `${selectedItems.map(item => 
        `${item.analysis.color} ${item.category}`
      ).join(' + ')}`,
      color_scheme: outfitRecommendation.color_harmony || 'harmonious color combination'
    };

    // Save outfit to database
    const { data: savedOutfit, error: saveError } = await supabase
      .from('outfits')
      .insert({
        user_id: userId,
        title: outfitRecommendation.title,
        prompt,
        mood,
        generated_image_url: null, // Will be generated on frontend with Canvas
        description: outfitRecommendation.description,
        recommended_clothes: outfitRecommendation.recommended_items,
        ai_analysis: {
          styling_tips: outfitRecommendation.styling_tips,
          occasion: outfitRecommendation.occasion,
          color_harmony: outfitRecommendation.color_harmony,
          pinterest_trends: pinterestTrends.slice(0, 2),
          clothes_analysis: validClothes,
          outfit_visualization: outfitVisualization
        }
      })
      .select()
      .single();

    if (saveError) {
      throw new Error(`Failed to save outfit: ${saveError.message}`);
    }

    console.log('Outfit generated and saved successfully');

    return new Response(JSON.stringify({
      outfit: savedOutfit,
      recommendedClothes: validClothes.filter(item => 
        outfitRecommendation.recommended_items.includes(item.id)
      )
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-outfit function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});