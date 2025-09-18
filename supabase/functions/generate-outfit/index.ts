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

    // Analyze user's clothes with OpenAI Vision
    const clothesAnalysis = await Promise.all(
      clothes.slice(0, 10).map(async (item) => { // Limit to 10 items to avoid token limits
        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
                  content: 'Analyze this clothing item and return a JSON object with: category, color, style, formality (casual/semi-formal/formal), season (spring/summer/fall/winter/all), and versatility (1-10 scale).'
                },
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: `Analyze this ${item.category} for outfit coordination:`
                    },
                    {
                      type: 'image_url',
                      image_url: { url: item.image_url }
                    }
                  ]
                }
              ],
              max_tokens: 200,
              temperature: 0.3
            }),
          });

          if (!response.ok) {
            console.error(`Failed to analyze item ${item.id}`);
            return null;
          }

          const data = await response.json();
          const analysis = JSON.parse(data.choices[0].message.content);
          
          return {
            ...item,
            analysis
          };
        } catch (error) {
          console.error(`Error analyzing item ${item.id}:`, error);
          return {
            ...item,
            analysis: {
              category: item.category,
              color: item.color || 'unknown',
              style: item.style || 'casual',
              formality: 'casual',
              season: 'all',
              versatility: 5
            }
          };
        }
      })
    );

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
      throw new Error('Failed to generate outfit recommendation');
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