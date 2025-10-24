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

    // Generate diffuse map (seamless 360° fabric texture)
    const diffusePrompt = `Generate a seamless, tileable fabric texture for this ${clothingType}.
      Requirements:
      - Extract the base fabric color and pattern from the input image
      - Create a flat, seamless 2D texture that can wrap 360° around a 3D model
      - Remove any logos, text, or asymmetric patterns that would break the texture loop
      - Reconstruct missing areas (sides/back) by mirroring and inferring fabric continuation
      - Neutral white lighting, no shadows, no perspective distortion
      - Output should be a flat fabric swatch, not rendered on any model
      - High detail photorealistic fabric texture
      - Size: 1024x1024 pixels
      - Perfectly tileable on all edges`;

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

    // Generate normal map (surface detail for light/shadow)
    const normalPrompt = `Generate a NORMAL MAP texture for this ${clothingType} fabric.
      Requirements:
      - Normal map color coding: flat neutral = RGB(128, 128, 255) purple-blue
      - Raised/bumpy areas = lighter blue-white tones
      - Recessed areas (seams, weave valleys) = darker purple-blue tones
      - Show fabric surface details: weave pattern, thread texture, subtle wrinkles
      - Emphasize seams and stitching as darker lines
      - Must be seamless and tileable for 3D UV wrapping
      - No perspective or lighting - pure height data encoded in RGB
      - Size: 1024x1024 pixels
      - Uniform detail distribution across entire texture`;

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

    // Generate roughness map (material reflectivity/glossiness)
    const roughnessPrompt = `Generate a ROUGHNESS MAP (grayscale) for this ${clothingType} fabric.
      Requirements:
      - Grayscale values representing surface glossiness:
        * White (255) = very rough/matte (cotton, wool, unfinished fabrics)
        * Light gray (180-220) = slightly rough (denim, canvas)
        * Medium gray (100-150) = semi-gloss (polyester, treated fabrics)
        * Dark gray (30-80) = glossy (silk, satin, leather)
        * Black (0) = mirror-like (buttons, zippers, metallic elements)
      - Analyze the fabric type from the input image
      - Consistent roughness across fabric areas
      - Detail variations for seams, buttons, or material transitions
      - Seamless and tileable texture
      - Size: 1024x1024 pixels`;

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

    // Generate alpha map (transparency mask) - optional for most clothing
    let alphaBase64 = null;
    const needsAlpha = ['lace', 'mesh', 'net', 'sheer', 'transparent'].some(term => 
      clothingType.toLowerCase().includes(term)
    );

    if (needsAlpha) {
      const alphaPrompt = `Generate an ALPHA/TRANSPARENCY MAP (grayscale) for this ${clothingType}.
        Requirements:
        - White (255) = fully opaque solid fabric areas
        - Black (0) = fully transparent holes, cutouts, or see-through areas
        - Gray values = semi-transparent (lace patterns, mesh, gauze)
        - Identify transparent fabric areas, holes, or decorative cutouts
        - Most of the fabric should be white (opaque)
        - Seamless and tileable texture
        - Size: 1024x1024 pixels`;

      const alphaResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
                { type: 'text', text: alphaPrompt },
                { type: 'image_url', image_url: { url: imageUrl } }
              ]
            }
          ],
          modalities: ['image', 'text']
        })
      });

      if (alphaResponse.ok) {
        const alphaData = await alphaResponse.json();
        alphaBase64 = alphaData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      }
    }

    const [diffuseUrl, normalUrl, roughnessUrl, alphaUrl] = await Promise.all([
      uploadMap(diffuseBase64, 'diffuse'),
      uploadMap(normalBase64 || '', 'normal'),
      uploadMap(roughnessBase64 || '', 'roughness'),
      alphaBase64 ? uploadMap(alphaBase64, 'alpha') : Promise.resolve(null)
    ]);

    const result = {
      status: 'success',
      item_type: clothingType,
      diffuse_url: diffuseUrl,
      normal_url: normalUrl,
      roughness_url: roughnessUrl,
      alpha_url: alphaUrl,
      metadata: {
        generated_at: new Date().toISOString(),
        source_image: imageUrl,
        texture_size: '1024x1024',
        seamless: true
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
