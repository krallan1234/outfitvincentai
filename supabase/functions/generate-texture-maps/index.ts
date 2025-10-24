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

    // Enhanced diffuse map with higher resolution
    const diffusePrompt = `Generate a seamless, tileable fabric texture for this ${clothingType}.
      Requirements:
      - Extract the exact base fabric color and pattern from the input image
      - Create a flat, seamless 2D texture that wraps perfectly 360° around a 3D model
      - Remove ALL logos, text, labels, or asymmetric patterns that would break seamless tiling
      - Reconstruct missing areas (sides/back) by intelligently mirroring and continuing the fabric pattern
      - Use neutral white/daylight lighting, no shadows, no highlights, no perspective distortion
      - Output must be a flat fabric swatch texture, NOT rendered on any model or mannequin
      - Ultra-high detail photorealistic fabric texture with visible weave/knit structure
      - Fabric-specific details: cotton = visible weave, denim = twill pattern, silk = smooth sheen
      - Size: 2048x2048 pixels for maximum detail
      - Perfectly tileable on all edges with no visible seams`;

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

    // Enhanced normal map for better 3D depth
    const normalPrompt = `Generate a NORMAL MAP texture for this ${clothingType} fabric.
      Requirements:
      - Normal map color coding: completely flat = RGB(128, 128, 255) neutral purple-blue
      - Raised/bumpy areas (thread peaks, wrinkles) = lighter blue-white tones RGB(180-255, 180-255, 200-255)
      - Recessed areas (seams, weave valleys, folds) = darker purple-blue tones RGB(50-100, 50-100, 200-255)
      - Show realistic fabric micro-details: individual thread weave, knit pattern, subtle natural wrinkles
      - Emphasize all seams, stitching, and hems as darker recessed lines
      - Add subtle fabric folds and natural draping where appropriate
      - Must be perfectly seamless and tileable for 3D UV wrapping
      - No perspective, no lighting, no shadows - pure surface height data encoded in RGB
      - Size: 2048x2048 pixels for high detail
      - Uniform detail distribution with natural fabric variation`;

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

    // Enhanced roughness map for material properties
    const roughnessPrompt = `Generate a ROUGHNESS MAP (grayscale) for this ${clothingType} fabric.
      Requirements:
      - Grayscale values representing surface glossiness and light reflection:
        * White (240-255) = very rough/matte (raw cotton, wool, fleece, terry cloth)
        * Light gray (180-220) = slightly rough (denim, canvas, chambray, twill)
        * Medium gray (100-150) = semi-gloss (polyester, nylon, treated cotton)
        * Dark gray (30-80) = glossy (silk, satin, leather, vinyl)
        * Near-black (5-25) = mirror-like reflective (metallic buttons, zippers, sequins)
      - Carefully analyze the fabric type and finish from the input image
      - Keep consistent roughness across similar fabric areas
      - Add subtle variation for fabric texture (slightly varied grays, not uniform)
      - Show detail variations for: seams (slightly rougher), buttons/zippers (glossy), worn areas
      - Perfectly seamless and tileable texture
      - Size: 2048x2048 pixels for detail`;

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
        - White (255) = fully opaque solid fabric areas (most of the texture)
        - Black (0) = fully transparent holes, cutouts, or see-through mesh areas
        - Gray values (128-200) = semi-transparent areas (lace patterns, mesh, gauze, tulle)
        - Carefully identify any transparent fabric areas, decorative holes, or mesh patterns
        - Most clothing should be 90%+ white (opaque) unless it's specifically lace/mesh
        - Perfectly seamless and tileable texture
        - Size: 2048x2048 pixels`;

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
        texture_size: '2048x2048',
        seamless: true,
        ai_model: 'google/gemini-2.5-flash-image-preview'
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
