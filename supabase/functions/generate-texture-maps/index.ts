import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateTextureWithAI(imageUrl: string, prompt: string, apiKey: string): Promise<string | null> {
  try {
    console.log('Generating texture with prompt:', prompt);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        modalities: ["image", "text"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!generatedImageUrl) {
      console.error('No image in AI response');
      return null;
    }

    return generatedImageUrl;
  } catch (error) {
    console.error('Texture generation error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, clothingType } = await req.json();
    
    if (!imageUrl || !clothingType) {
      throw new Error('Missing imageUrl or clothingType');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Generating textures for ${clothingType} from ${imageUrl}`);
    
    // Generate diffuse map with enhanced fabric details
    const diffusePrompt = `Create a seamless, tileable fabric texture based on this ${clothingType}. Enhance fabric details, preserve the original color and pattern exactly, make it look realistic and high-quality for 3D rendering. Output size: 2048x2048px.`;
    const diffuseUrl = await generateTextureWithAI(imageUrl, diffusePrompt, LOVABLE_API_KEY);

    // Generate normal map for fabric depth
    const normalPrompt = `Create a normal map for this ${clothingType} fabric. Show the weave pattern and fabric texture in purple/blue tones. The flatter areas should be RGB(128,128,255) and raised areas should vary the red/green channels. Make it seamless and tileable. Output size: 2048x2048px.`;
    const normalUrl = await generateTextureWithAI(imageUrl, normalPrompt, LOVABLE_API_KEY);

    // Generate roughness map for material properties
    const roughnessPrompt = `Create a grayscale roughness map for this ${clothingType} fabric. White = rough areas (fabric texture), Black = smooth areas (no variation). Show the fabric weave and material properties. Make it seamless and tileable. Output size: 2048x2048px.`;
    const roughnessUrl = await generateTextureWithAI(imageUrl, roughnessPrompt, LOVABLE_API_KEY);

    // Use original image as fallback for diffuse if AI generation fails
    const finalDiffuseUrl = diffuseUrl || imageUrl;
    
    console.log('Texture generation results:', {
      diffuse: finalDiffuseUrl ? 'Success' : 'Failed',
      normal: normalUrl ? 'Success' : 'Skipped',
      roughness: roughnessUrl ? 'Success' : 'Skipped'
    });

    const result = {
      type: clothingType,
      diffuse_url: finalDiffuseUrl,
      normal_url: normalUrl,
      roughness_url: roughnessUrl,
      alpha_url: null,
      metadata: {
        generated_at: new Date().toISOString(),
        source_image: imageUrl,
        ai_enhanced: diffuseUrl !== null
      }
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating texture maps:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
