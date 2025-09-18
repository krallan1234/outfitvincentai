import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
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

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
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

    // Generate outfit recommendation using GPT
    const outfitPrompt = `
      Based on these clothing items: ${JSON.stringify(validClothes.map(item => ({
        id: item.id,
        category: item.category,
        color: item.analysis.color,
        style: item.analysis.style,
        formality: item.analysis.formality
      })))}
      
      Create an outfit for: "${prompt}" ${mood ? `with a ${mood} mood` : ''}
      
      Return a JSON object with:
      - title: Creative outfit name
      - description: 2-3 sentence description
      - recommended_items: Array of clothing item IDs that work together
      - styling_tips: Array of 2-3 styling suggestions
      - occasion: Best occasions for this outfit
    `;

    const outfitResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional fashion stylist. Create outfit recommendations based on available clothing items.'
          },
          {
            role: 'user',
            content: outfitPrompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      }),
    });

    if (!outfitResponse.ok) {
      const errorData = await outfitResponse.text();
      console.error('OpenAI API error:', outfitResponse.status, errorData);
      
      if (outfitResponse.status === 429) {
        throw new Error('OpenAI quota exceeded. Please try again later or contact support.');
      } else if (outfitResponse.status === 401) {
        throw new Error('OpenAI API authentication failed. Please check your API key.');
      } else {
        throw new Error(`OpenAI API error (${outfitResponse.status}): Failed to generate outfit recommendation`);
      }
    }

    const outfitData = await outfitResponse.json();
    const outfitRecommendation = JSON.parse(outfitData.choices[0].message.content);

    // Generate outfit image with DALL-E
    let generatedImageUrl = null;
    try {
      const dallePrompt = `Fashion illustration: ${outfitRecommendation.description}. Style: clean, modern fashion sketch with soft colors. The outfit should match the ${mood || 'general'} mood and be suitable for ${prompt}. High-quality fashion illustration style.`;

      const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: dallePrompt,
          size: '1024x1024',
          quality: 'standard',
          n: 1
        }),
      });

      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        generatedImageUrl = imageData.data[0].url;
      }
    } catch (error) {
      console.error('DALL-E generation failed:', error);
    }

    // Save outfit to database
    const { data: savedOutfit, error: saveError } = await supabase
      .from('outfits')
      .insert({
        user_id: userId,
        title: outfitRecommendation.title,
        prompt,
        mood,
        generated_image_url: generatedImageUrl,
        description: outfitRecommendation.description,
        recommended_clothes: outfitRecommendation.recommended_items,
        ai_analysis: {
          styling_tips: outfitRecommendation.styling_tips,
          occasion: outfitRecommendation.occasion,
          clothes_analysis: validClothes
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