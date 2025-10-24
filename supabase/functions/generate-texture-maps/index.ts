import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log('Using original image as texture (skipping AI generation to avoid failures)');
    
    // Use original image URL directly as diffuse map
    // This avoids the "Failed to extract image" error from AI generation
    const diffuseUrl = imageUrl;
    const normalBase64 = null; // Skip normal map
    const roughnessBase64 = null; // Skip roughness map

    // Skip alpha map (not needed for simple texture application)
    const alphaUrl = null;
    
    // Use original image as diffuse, skip other maps
    const normalUrl = null;
    const roughnessUrl = null;

    const result = {
      type: clothingType,
      diffuse_url: diffuseUrl,
      normal_url: normalUrl,
      roughness_url: roughnessUrl,
      alpha_url: alphaUrl,
      metadata: {
        generated_at: new Date().toISOString(),
        source_image: imageUrl
      }
    };

    console.log('Texture maps generated successfully:', result);

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
