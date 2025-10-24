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

    console.log('Generating texture maps for clothing type:', clothingType);

    // Generate diffuse map (realistic back view)
    const diffusePrompt = `Generate a professional photograph of the BACK VIEW of this ${clothingType}. 
      Match the exact color, pattern, and fabric texture from the front view.
      Studio lighting, neutral white background, flat lay perspective.
      Realistic wrinkles and fabric behavior.
      High detail, photorealistic quality.`;

    const diffuseResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: diffusePrompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        modalities: ['image', 'text']
      })
    });

    if (!diffuseResponse.ok) {
      console.error('Diffuse generation failed:', await diffuseResponse.text());
      throw new Error('Failed to generate diffuse map');
    }

    const diffuseData = await diffuseResponse.json();
    const diffuseBase64 = diffuseData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!diffuseBase64) {
      throw new Error('No diffuse image generated');
    }

    // Generate normal map (surface detail enhancement)
    const normalPrompt = `Generate a NORMAL MAP (surface detail texture) for this ${clothingType}.
      Purple-blue gradient representing surface height variations.
      Emphasize fabric weave, seams, stitching, and wrinkles.
      Flat areas should be neutral purple (RGB 128, 128, 255).
      Raised areas lighter, recessed areas darker.
      Seamless, tileable texture.`;

    const normalResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: normalPrompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        modalities: ['image', 'text']
      })
    });

    const normalData = await normalResponse.json();
    const normalBase64 = normalData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    // Generate roughness map (material reflectivity)
    const roughnessPrompt = `Generate a ROUGHNESS MAP (grayscale) for this ${clothingType}.
      White = rough/matte surfaces (cotton, wool)
      Black = smooth/glossy surfaces (silk, leather, buttons)
      Gray = semi-gloss (polyester, denim)
      Analyze fabric type and create appropriate roughness values.`;

    const roughnessResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: roughnessPrompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        modalities: ['image', 'text']
      })
    });

    const roughnessData = await roughnessResponse.json();
    const roughnessBase64 = roughnessData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    // Upload generated maps to Supabase Storage
    const uploadMap = async (base64Data: string, mapType: string) => {
      if (!base64Data) return null;
      
      const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
      
      const fileName = `texture-maps/${clothingType}-${mapType}-${Date.now()}.png`;
      const { data, error } = await supabase.storage
        .from('clothes')
        .upload(fileName, buffer, {
          contentType: 'image/png',
          upsert: false
        });

      if (error) {
        console.error(`Failed to upload ${mapType} map:`, error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('clothes')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    };

    const [diffuseUrl, normalUrl, roughnessUrl] = await Promise.all([
      uploadMap(diffuseBase64, 'diffuse'),
      uploadMap(normalBase64 || '', 'normal'),
      uploadMap(roughnessBase64 || '', 'roughness')
    ]);

    const result = {
      type: clothingType,
      diffuse_url: diffuseUrl,
      normal_url: normalUrl,
      roughness_url: roughnessUrl,
      alpha_url: null, // Not needed for most clothing
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
