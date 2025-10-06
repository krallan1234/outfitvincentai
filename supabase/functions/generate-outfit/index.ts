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
    const { prompt, mood, userId, isPublic = true } = await req.json();

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

    // Prepare clothes analysis with category grouping
    console.log('Preparing clothes analysis and category grouping...');
    
    // Define category mappings for logical outfit creation
    const categoryMappings = {
      'top': ['shirt', 'blouse', 't-shirt', 'sweater', 'tank top', 'crop top', 'tank-top', 'crop-top'],
      'bottom': ['pants', 'jeans', 'skirt', 'shorts', 'trousers', 'leggings'],
      'outerwear': ['jacket', 'coat', 'blazer', 'cardigan', 'hoodie', 'vest'],
      'dress': ['dress', 'suit', 'jumpsuit'],
      'footwear': ['shoes', 'boots', 'sneakers', 'sandals', 'heels', 'slippers'],
      'accessories': [
        // Jewelry
        'belt', 'necklace', 'scarf', 'bracelet', 'earrings',
        // Headwear
        'hat', 'bag', 'cap', 'caps', 'beanie', 'kepsar',
        // Watches & Rings
        'watch', 'watches', 'klockor', 'ring', 'ringar', 'rings',
        // Other
        'gloves', 'socks', 'strumpor', 'sunglasses', 'tie'
      ]
    };

    // Normalize and group clothes by category
    const clothesAnalysis = clothes.map((item) => {
      // Use existing metadata as fallback, enhanced with AI data if available
      let normalizedCategory = item.category?.toLowerCase() || 'other';
      
      // Map specific items to main categories
      let mainCategory = 'other';
      for (const [category, items] of Object.entries(categoryMappings)) {
        if (items.some(categoryItem => normalizedCategory.includes(categoryItem))) {
          mainCategory = category;
          break;
        }
      }

      const fallbackAnalysis = {
        category: item.category,
        main_category: mainCategory,
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
              main_category: mainCategory,
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
    
    // Group clothes by main category for logical outfit creation
    const clothesByCategory = {
      top: validClothes.filter(item => item.analysis.main_category === 'top'),
      bottom: validClothes.filter(item => item.analysis.main_category === 'bottom'),
      dress: validClothes.filter(item => item.analysis.main_category === 'dress'),
      outerwear: validClothes.filter(item => item.analysis.main_category === 'outerwear'),
      footwear: validClothes.filter(item => item.analysis.main_category === 'footwear'),
      accessories: validClothes.filter(item => item.analysis.main_category === 'accessories')
    };

    console.log('Clothes grouped by category:', {
      top: clothesByCategory.top.length,
      bottom: clothesByCategory.bottom.length,
      dress: clothesByCategory.dress.length,
      outerwear: clothesByCategory.outerwear.length,
      footwear: clothesByCategory.footwear.length,
      accessories: clothesByCategory.accessories.length
    });

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

    // Step 2: Use Gemini 2.5 Pro to generate outfit recommendations with enhanced thinking
    const generateOutfitPrompt = (attempt = 1, shouldIncludeAccessory = false) => `
      You are a professional fashion stylist with expertise in creating logical, category-based outfit combinations.
      
      ANALYZE AND COMBINE:
      1. Review available clothes by colors, styles, and categories
      2. Use Pinterest trends for inspiration
      3. Select exactly one item per category for a harmonious outfit

      CRITICAL RULES - YOU MUST FOLLOW THESE EXACTLY:
      1. Select AT MOST ONE item per category: top, bottom, dress, outerwear, footwear, accessories
      2. NEVER select multiple items from the same main category (e.g., no two tops, no two bottoms)
      3. Minimum outfit must have: (1 top + 1 bottom) OR (1 dress)
      4. Optional additions: 1 outerwear + 1 footwear + 1 accessory
      5. ACCESSORY PRIORITY: ${shouldIncludeAccessory ? 'MUST include at least one accessory (kepsar/caps for casual, ringar/rings or klockor/watches for elegant) if available in wardrobe' : 'Include accessories in 20-30% of outfits, prioritizing kepsar for casual moods and ringar/klockor for elegant/formal moods'}

      AVAILABLE CLOTHES BY CATEGORY:
      TOPS: ${JSON.stringify(clothesByCategory.top.map(item => ({
        id: item.id,
        name: item.category,
        color: item.analysis.color,
        style: item.analysis.style,
        image_url: item.image_url
      })))}
      
      BOTTOMS: ${JSON.stringify(clothesByCategory.bottom.map(item => ({
        id: item.id,
        name: item.category,
        color: item.analysis.color,
        style: item.analysis.style,
        image_url: item.image_url
      })))}
      
      DRESSES: ${JSON.stringify(clothesByCategory.dress.map(item => ({
        id: item.id,
        name: item.category,
        color: item.analysis.color,
        style: item.analysis.style,
        image_url: item.image_url
      })))}
      
      OUTERWEAR: ${JSON.stringify(clothesByCategory.outerwear.map(item => ({
        id: item.id,
        name: item.category,
        color: item.analysis.color,
        style: item.analysis.style,
        image_url: item.image_url
      })))}
      
      FOOTWEAR: ${JSON.stringify(clothesByCategory.footwear.map(item => ({
        id: item.id,
        name: item.category,
        color: item.analysis.color,
        style: item.analysis.style,
        image_url: item.image_url
      })))}
      
      ACCESSORIES: ${JSON.stringify(clothesByCategory.accessories.map(item => ({
        id: item.id,
        name: item.category,
        color: item.analysis.color,
        style: item.analysis.style,
        image_url: item.image_url
      })))}

      USER REQUEST: "${prompt}" ${mood ? `with a ${mood} mood` : ''}
      
      PINTEREST INSPIRATION: ${pinterestTrends.length > 0 ? 
        pinterestTrends.map(trend => trend.description || 'trending style').join(', ') : 
        'classic styling'}

      ${attempt > 1 ? 'PREVIOUS ATTEMPT FAILED - Fix: Remove duplicates and select exactly one item per category.' : ''}

      CREATIVE STYLING INSTRUCTIONS:
      1. Use your fashion expertise to choose items that complement each other in color, style, and mood
      2. Draw inspiration from Pinterest trends to create modern, trendy combinations
      3. Consider color harmony (complementary, analogous, or monochromatic schemes)
      4. Match formality levels (casual with casual, formal with formal)
      5. Ensure the outfit is appropriate for the requested mood/occasion
      6. ACCESSORY MATCHING: For casual moods, prefer kepsar/caps; for elegant/formal moods, prefer ringar/rings if available
      7. Be creative and confident in your choices - select items that create a cohesive, stylish look
      8. If Pinterest trends suggest specific accessory combinations (e.g., caps with streetwear, rings with elegant outfits), incorporate them

      REQUIRED JSON FORMAT - NO MARKDOWN WRAPPER:
      {
        "title": "Creative outfit name",
        "description": "2-3 sentence description explaining why this combination works",
        "color_harmony": "Description of color scheme and harmony",
        "items": [
          {
            "category": "top",
            "item_id": "actual_item_id",
            "item_name": "Black Shirt",
            "color": "black",
            "style": "casual",
            "image_url": "supabase_storage_url"
          }
        ],
        "perfect_for": ["occasion1", "occasion2"],
        "styling_tips": ["tip1", "tip2", "tip3"]
      }

      ${!shouldIncludeAccessory && clothesByCategory.accessories.length > 0 ? 'IMPORTANT: If no accessories are selected, add "Consider adding a keps or ring for extra style!" to styling_tips.' : ''}
    `;

    let outfitRecommendation;
    let attemptCount = 0;
    const maxAttempts = 3;
    let shouldIncludeAccessory = false;

    while (attemptCount < maxAttempts) {
      attemptCount++;
      console.log(`Generating outfit (attempt ${attemptCount}/${maxAttempts})...`);

      const outfitPrompt = generateOutfitPrompt(attemptCount, shouldIncludeAccessory);

      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiApiKey}`, {
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
            maxOutputTokens: 8000,  // Increased significantly for Gemini 2.5 Pro thinking + output
            temperature: 0.7,
            topP: 0.95,
            topK: 40
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
      console.log('Full Gemini API response:', JSON.stringify(geminiData));
      
      // Handle Gemini 2.5 Pro response structure
      if (!geminiData.candidates || geminiData.candidates.length === 0) {
        console.error('No candidates in Gemini response:', geminiData);
        throw new Error('Gemini API returned no candidates. Please try again.');
      }
      
      const candidate = geminiData.candidates[0];
      
      // Check for MAX_TOKENS finish reason
      if (candidate.finishReason === 'MAX_TOKENS') {
        console.error('Gemini hit MAX_TOKENS limit. Response was truncated.');
        console.error('Usage metadata:', geminiData.usageMetadata);
        
        // If we have partial content, try to use it
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          console.log('Attempting to use partial response despite MAX_TOKENS');
        } else {
          console.error('No content available after MAX_TOKENS limit');
          if (attemptCount < maxAttempts) {
            console.log('Will retry with adjusted parameters...');
            continue; // Retry
          }
          throw new Error('Gemini response was cut off due to token limit. Please try with a simpler prompt or fewer clothes.');
        }
      }
      
      if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        console.error('Invalid candidate structure:', candidate);
        if (attemptCount < maxAttempts) {
          continue; // Retry
        }
        throw new Error('Gemini API returned invalid response structure.');
      }
      
      const content = candidate.content.parts[0].text;
      
      // Log raw response for debugging
      console.log(`Raw Gemini response (attempt ${attemptCount}):`, content);
      
      // Parse JSON from potentially markdown-wrapped response
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

        // Validate outfit for category duplicates
        if (!outfitRecommendation.items || !Array.isArray(outfitRecommendation.items)) {
          throw new Error('Invalid outfit format: missing items array');
        }

        // Check for category duplicates
        const categories = outfitRecommendation.items.map(item => item.category);
        const uniqueCategories = new Set(categories);
        
        if (categories.length !== uniqueCategories.size) {
          console.log('Found duplicate categories, retrying...');
          if (attemptCount < maxAttempts) {
            continue; // Retry with fix prompt
          } else {
            throw new Error('Multiple attempts failed to generate valid outfit');
          }
        }

        // Validate minimum outfit requirements (at least top + bottom OR dress)
        const hasTop = categories.includes('top');
        const hasBottom = categories.includes('bottom');
        const hasDress = categories.includes('dress');
        
        const isValidOutfit = (hasTop && hasBottom) || hasDress;
        
        if (!isValidOutfit) {
          console.log('Outfit missing essential items (needs top+bottom or dress), retrying...');
          if (attemptCount < maxAttempts) {
            continue; // Retry
          } else {
            throw new Error('Could not generate valid outfit with available clothes');
          }
        }

        // Check if accessories were included when available
        const hasAccessories = categories.includes('accessories');
        const accessoriesAvailable = clothesByCategory.accessories.length > 0;
        
        if (!hasAccessories && accessoriesAvailable && !shouldIncludeAccessory && attemptCount < maxAttempts) {
          console.log('No accessories included despite availability. Re-prompting with accessory requirement...');
          shouldIncludeAccessory = true;
          continue; // Retry with accessory requirement
        }

        console.log('Valid outfit generated successfully');
        break; // Success, exit loop

      } catch (parseError) {
        console.error(`Parse error on attempt ${attemptCount}:`, parseError);
        console.error('Content that failed to parse:', content);
        
        if (attemptCount >= maxAttempts) {
          throw new Error('Invalid JSON response from AI after multiple attempts. Please try again.');
        }
        // Continue to retry
      }
    }

    // Generate outfit visualization from new structured format
    const selectedItems = validClothes.filter(item => 
      outfitRecommendation.items.some(outfitItem => outfitItem.item_id === item.id)
    );
    
    const outfitVisualization = {
      items: selectedItems.map(item => ({
        id: item.id,
        category: item.category,
        main_category: item.analysis.main_category,
        color: item.analysis.color,
        image_url: item.image_url
      })),
      description: `${selectedItems.map(item => 
        `${item.analysis.color} ${item.category}`
      ).join(' + ')}`,
      color_scheme: outfitRecommendation.color_harmony || 'harmonious color combination'
    };

    // Convert new format to legacy format for database compatibility
    const legacyRecommendedItems = outfitRecommendation.items.map(item => item.item_id);

    // Save outfit to database
    const { data: savedOutfit, error: saveError } = await supabase
      .from('outfits')
      .insert({
        user_id: userId,
        title: outfitRecommendation.title,
        prompt,
        mood,
        is_public: isPublic,
        generated_image_url: null, // Will be generated on frontend with Canvas
        description: outfitRecommendation.description,
        recommended_clothes: legacyRecommendedItems,
        ai_analysis: {
          styling_tips: outfitRecommendation.styling_tips,
          occasion: outfitRecommendation.perfect_for,
          color_harmony: outfitRecommendation.color_harmony,
          pinterest_trends: pinterestTrends.slice(0, 2),
          clothes_analysis: validClothes,
          outfit_visualization: outfitVisualization,
          structured_items: outfitRecommendation.items // New structured format
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
      recommendedClothes: selectedItems,
      structuredOutfit: outfitRecommendation // Return new structured format
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