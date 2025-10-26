import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { GenerateOutfitRequestSchema } from './schema.ts';
import { Logger, withRetry, errorResponse, successResponse, getAuthUserId } from './utils.ts';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logger = new Logger('generate-outfit');

// Simple rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 10; // 10 outfit generations per minute

const checkRateLimit = (identifier: string): boolean => {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= MAX_REQUESTS) {
    return false;
  }
  
  record.count++;
  return true;
};

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
const pinterestApiKey = Deno.env.get('PINTEREST_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  logger.info('Outfit generation request received');

  // Rate limiting
  const authHeader = req.headers.get('authorization');
  const identifier = authHeader || req.headers.get('x-forwarded-for') || 'anonymous';
  
  if (!checkRateLimit(identifier)) {
    logger.warn('Rate limit exceeded', { identifier });
    return errorResponse(
      429,
      'Rate limit exceeded. You can only generate 10 outfits per minute.',
      'RATE_LIMIT_EXCEEDED',
      undefined,
      corsHeaders
    );
  }

    // Validate JWT authentication (Supabase handles this, but we can add extra validation)
    const authenticatedUserId = getAuthUserId(req);
    if (!authenticatedUserId) {
      logger.error('Unauthenticated request');
      return errorResponse(
        401, 
        'Authentication required', 
        'UNAUTHENTICATED',
        undefined,
        corsHeaders
      );
    }

    // Parse and validate request body
    const rawBody = await req.json();
    
    logger.info('Validating request body', { 
      hasPrompt: !!rawBody.prompt,
      hasUserId: !!rawBody.userId,
    });

    const validationResult = GenerateOutfitRequestSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      logger.error('Request validation failed', validationResult.error, {
        errors: validationResult.error.errors,
      });
      
      return errorResponse(
        400,
        'Invalid request data',
        'VALIDATION_ERROR',
        {
          errors: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        corsHeaders
      );
    }

    const { 
      prompt, 
      mood, 
      userId, 
      isPublic, 
      pinterestBoardId, 
      selectedItem, 
      purchaseLinks, 
      weatherData, 
      userPreferences, 
      pinterestContext, 
      pinterestPins, 
      generateImage,
    } = validationResult.data;

    // Verify user authorization (authenticated user must match requested userId)
    if (authenticatedUserId !== userId) {
      logger.error('Authorization failed', undefined, { 
        authenticatedUserId, 
        requestedUserId: userId,
      });
      
      return errorResponse(
        403, 
        'Not authorized to generate outfits for this user', 
        'FORBIDDEN',
        undefined,
        corsHeaders
      );
    }

    // Check API key configuration
    if (!lovableApiKey) {
      logger.error('Lovable AI key not configured');
      return errorResponse(
        500, 
        'AI service is not configured', 
        'SERVICE_MISCONFIGURED',
        undefined,
        corsHeaders
      );
    }

    logger.info('Request validated successfully', {
      userId,
      promptLength: prompt.length,
      mood,
      hasWeather: !!weatherData,
      hasPreferences: !!userPreferences,
      generateImage,
    });

    // Extract selected item IDs for filtering logic
    const selectedItemIds = selectedItem 
      ? (Array.isArray(selectedItem) 
          ? selectedItem.map((item: any) => item.id)
          : [selectedItem.id])
      : [];

    logger.info('Starting outfit generation', {
      userId,
      weatherData: weatherData ? `${weatherData.temperature}°C, ${weatherData.condition}` : 'Not provided',
      userPreferences: userPreferences ? 'Provided' : 'Not provided',
      selectedItemsCount: selectedItemIds.length,
    });

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's clothes with error handling
    const { data: clothes, error: clothesError } = await supabase
      .from('clothes')
      .select('*')
      .eq('user_id', userId);

    if (clothesError) {
      logger.error('Failed to fetch clothes from database', clothesError);
      return errorResponse(
        500, 
        'Failed to load wardrobe data', 
        'DATABASE_ERROR',
        undefined,
        corsHeaders
      );
    }

    if (!clothes || clothes.length === 0) {
      logger.warn('User has no clothes in wardrobe', { userId });
      return errorResponse(
        400, 
        'Please upload clothing items to your wardrobe first', 
        'NO_CLOTHES',
        undefined,
        corsHeaders
      );
    }

    logger.info(`Analyzing ${clothes.length} clothing items for outfit generation`);

    // Prepare clothes analysis with category grouping
    console.log('Preparing clothes analysis and category grouping...');
    
    // Define category mappings for logical outfit creation
    const categoryMappings = {
      'top': ['shirt', 'blouse', 't-shirt', 'sweater', 'tank top', 'crop top', 'tank-top', 'crop-top'],
      'bottom': ['pants', 'jeans', 'skirt', 'shorts', 'trousers', 'leggings'],
      'outerwear': ['jacket', 'coat', 'blazer', 'cardigan', 'hoodie', 'vest', 'rain-jacket'],
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

    // Define layering categories for better logic
    const layeringCategories = {
      'base_layers': ['t-shirt', 'tank-top', 'blouse', 'shirt', 'long-sleeve'],
      'warm_layers': ['sweater', 'hoodie', 'cardigan'],
      'outer_layers': ['jacket', 'coat', 'blazer', 'rain-jacket', 'vest']
    };

    // Define style compatibility rules based on formality and context
    const styleRules = {
      'business': {
        priority: ['formal', 'business', 'smart casual', 'semi-formal'],
        allowed: ['blazer', 'shirt', 'blouse', 'dress pants', 'skirt', 'chinos', 'dress', 'suit', 'loafers', 'heels', 'oxfords', 'pumps', 'belt', 'watch', 'tie', 'necklace'],
        excluded: ['joggers', 'sweatpants', 'hoodie', 'sneakers', 'flip-flops', 'tank top', 'crop top', 'athletic', 'gym', 'sporty'],
        keywords: ['business', 'meeting', 'office', 'professional', 'work', 'corporate', 'interview']
      },
      'formal': {
        priority: ['formal', 'elegant', 'evening'],
        allowed: ['dress', 'suit', 'blazer', 'dress shirt', 'gown', 'heels', 'pumps', 'oxfords', 'tie', 'bow tie', 'clutch', 'jewelry'],
        excluded: ['jeans', 'sneakers', 't-shirt', 'hoodie', 'athletic', 'casual', 'sporty', 'joggers'],
        keywords: ['formal', 'elegant', 'gala', 'evening', 'wedding', 'cocktail', 'black tie']
      },
      'casual': {
        priority: ['casual', 'smart casual', 'relaxed'],
        allowed: ['t-shirt', 'jeans', 'sweater', 'sneakers', 'casual shirt', 'chinos', 'shorts', 'sandals', 'hoodie', 'cap'],
        excluded: ['blazer', 'suit', 'formal dress', 'heels'],
        keywords: ['casual', 'everyday', 'relaxed', 'comfortable', 'weekend', 'hangout']
      },
      'athletic': {
        priority: ['athletic', 'sporty', 'active'],
        allowed: ['joggers', 'sweatpants', 'athletic shorts', 'tank top', 'sports bra', 'sneakers', 'hoodie', 'cap'],
        excluded: ['dress', 'suit', 'heels', 'blazer', 'formal'],
        keywords: ['gym', 'workout', 'athletic', 'sporty', 'exercise', 'running', 'fitness', 'active']
      },
      'streetwear': {
        priority: ['streetwear', 'urban', 'edgy', 'trendy'],
        allowed: ['hoodie', 'sneakers', 'joggers', 'oversized', 'graphic tee', 'denim', 'cap', 'chains'],
        excluded: ['blazer', 'formal dress', 'heels', 'business'],
        keywords: ['streetwear', 'urban', 'hip hop', 'cool', 'edgy', 'trendy', 'street style']
      },
      'date': {
        priority: ['elegant', 'smart casual', 'stylish'],
        allowed: ['dress', 'nice shirt', 'blazer', 'heels', 'stylish shoes', 'jewelry', 'skirt', 'fitted pants'],
        excluded: ['joggers', 'sweatpants', 'athletic', 'gym', 'sloppy'],
        keywords: ['date', 'romantic', 'dinner', 'night out', 'elegant']
      },
      'summer': {
        priority: ['light', 'breathable', 'casual'],
        allowed: ['shorts', 'tank top', 'sundress', 'sandals', 'light fabrics', 't-shirt', 'skirt'],
        excluded: ['heavy coat', 'boots', 'thick sweater', 'wool'],
        keywords: ['summer', 'beach', 'hot', 'sunny', 'warm', 'vacation']
      }
    };

    // Detect style context from prompt
    const detectStyleContext = (prompt: string): string => {
      const lowerPrompt = prompt.toLowerCase();
      for (const [style, rules] of Object.entries(styleRules)) {
        if (rules.keywords.some(keyword => lowerPrompt.includes(keyword))) {
          console.log(`Detected style context: ${style}`);
          return style;
        }
      }
      return 'casual'; // default
    };

    const styleContext = detectStyleContext(prompt);
    const contextRules = styleRules[styleContext] || styleRules['casual'];

    // Normalize and group clothes by category with style filtering
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
        versatility: 7,
        style_score: 0.5 // Default score
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

      // Filter based on style context rules
      const itemCategory = normalizedCategory.toLowerCase();
      const itemStyle = (analysis.style || '').toLowerCase();
      
      // Check if this item is explicitly selected by the user (mandatory items)
      const isUserSelected = selectedItemIds.includes(item.id);
      
      // Check if item is explicitly excluded for this style context
      const isExcluded = contextRules.excluded.some(excluded => 
        itemCategory.includes(excluded.toLowerCase()) || 
        item.category?.toLowerCase().includes(excluded.toLowerCase()) ||
        itemStyle.includes(excluded.toLowerCase())
      );
      
      // If explicitly excluded BUT user selected it, keep it and log override
      if (isExcluded && isUserSelected) {
        console.log(`Keeping user-selected ${item.category} (${item.color}) despite ${styleContext} context exclusion`);
      }
      // If explicitly excluded and NOT user selected, filter it out
      else if (isExcluded) {
        console.log(`Filtering out ${item.category} (${item.color}) - excluded for ${styleContext} context`);
        return null;
      }

      return {
        ...item,
        analysis
      };
    }).filter(item => item !== null); // Remove filtered items

    const validClothes = clothesAnalysis;
    
    // Group clothes by main category for logical outfit creation
    const clothesByCategory = {
      top: validClothes.filter(item => item.analysis.main_category === 'top'),
      bottom: validClothes.filter(item => item.analysis.main_category === 'bottom'),
      dress: validClothes.filter(item => item.analysis.main_category === 'dress'),
      outerwear: validClothes.filter(item => item.analysis.main_category === 'outerwear'),
      footwear: validClothes.filter(item => item.analysis.main_category === 'footwear'),
      accessories: validClothes.filter(item => item.analysis.main_category === 'accessories')
    };

    console.log(`Clothes filtered for ${styleContext} style:`, {
      total_available: validClothes.length,
      filtered_out: clothes.length - validClothes.length,
      top: clothesByCategory.top.length,
      bottom: clothesByCategory.bottom.length,
      dress: clothesByCategory.dress.length,
      outerwear: clothesByCategory.outerwear.length,
      footwear: clothesByCategory.footwear.length,
      accessories: clothesByCategory.accessories.length
    });

    // Check if we have enough items after filtering
    if (validClothes.length < 2) {
      console.error(`Not enough suitable items for ${styleContext} style after filtering`);
      return new Response(JSON.stringify({ 
        error: `Not enough suitable clothing items for "${styleContext}" style. Try adding more ${contextRules.allowed.slice(0, 3).join(', ')} to your wardrobe.`
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 1: Use Pinterest inspiration from frontend or user's board
    let pinterestTrends = pinterestPins || [];
    let boardInspiration = [];
    
    // If user has connected a Pinterest board, use pins from their board
    if (pinterestBoardId) {
      console.log(`Using connected Pinterest board: ${pinterestBoardId}`);
      try {
        const { data: boardData, error: boardError } = await supabase
          .from('pinterest_boards')
          .select('pins_data, board_name')
          .eq('user_id', userId)
          .eq('board_id', pinterestBoardId)
          .single();
        
        if (!boardError && boardData && boardData.pins_data) {
          const pins = boardData.pins_data as any[];
          // Randomly select 5 pins from user's board for analysis
          boardInspiration = pins
            .sort(() => Math.random() - 0.5)
            .slice(0, 5);
          console.log(`Analyzing ${boardInspiration.length} pins from board "${boardData.board_name}"`);
        }
      } catch (error) {
        console.warn('Failed to fetch Pinterest board data:', error);
      }
    }
    
    // Log Pinterest inspiration sources
    if (pinterestContext) {
      console.log('Using Pinterest trends context from frontend:', pinterestContext);
    }
    if (pinterestTrends.length > 0) {
      console.log(`Using ${pinterestTrends.length} Pinterest trend pins from frontend`);
    }

    // Get recent outfits to avoid repeats
    const { data: recentOutfits } = await supabase
      .from('outfits')
      .select('recommended_clothes, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    const recentItemIds = recentOutfits
      ?.flatMap(o => o.recommended_clothes || [])
      .filter((id, index, self) => self.indexOf(id) === index) || [];
    
    console.log(`Avoiding ${recentItemIds.length} recently used items for variety`);

    // Step 2: Use Gemini 2.5 Pro to generate outfit recommendations with enhanced thinking
    const generateOutfitPrompt = (attempt = 1, shouldIncludeAccessory = false) => {
      // Determine accessory type based on mood/prompt for smarter selection
      const lowerPrompt = `${prompt} ${mood || ''}`.toLowerCase();
      const suggestedAccessory = 
        lowerPrompt.includes('casual') || lowerPrompt.includes('summer') || lowerPrompt.includes('sporty') ? 'kepsar (caps)' :
        lowerPrompt.includes('elegant') || lowerPrompt.includes('formal') || lowerPrompt.includes('office') ? 'ringar (rings) or klockor (watches)' :
        'any appropriate accessory';
      
      return `
      You are a professional fashion stylist with expertise in creating logical, category-based outfit combinations.
      
      CRITICAL STYLE CONTEXT: ${styleContext.toUpperCase()}
      This outfit MUST match the "${styleContext}" style. The clothes have been pre-filtered to match this context.
      
      STRICT STYLE REQUIREMENTS FOR ${styleContext.toUpperCase()}:
      - Priority styles: ${contextRules.priority.join(', ')}
      - ONLY use items that fit: ${contextRules.allowed.join(', ')}
      - NEVER include: ${contextRules.excluded.join(', ')}
      - Context keywords: ${contextRules.keywords.join(', ')}
      
      ${styleContext === 'business' ? `
      BUSINESS STYLE RULES:
      - MUST include: Blazer OR dress shirt/blouse with dress pants/skirt
      - Footwear: ONLY loafers, oxfords, heels, or dress shoes
      - Colors: Professional colors (navy, gray, black, white, beige)
      - NO casual items like sneakers, hoodies, or athletic wear
      - Accessories: Watch, belt, or subtle jewelry only
      ` : ''}
      
      ${styleContext === 'formal' ? `
      FORMAL STYLE RULES:
      - MUST include: Suit, dress, or formal gown
      - Footwear: ONLY heels, pumps, or dress shoes
      - NO jeans, sneakers, or casual tops
      - Elegant accessories: Jewelry, clutch, tie
      - Sophisticated color palette
      ` : ''}
      
      ${styleContext === 'athletic' ? `
      ATHLETIC STYLE RULES:
      - MUST include: Athletic wear (joggers, sports top, athletic shorts)
      - Footwear: ONLY sneakers or athletic shoes
      - NO formal wear, dresses, or business attire
      - Functional accessories: Cap, sports watch
      ` : ''}
      
      ${styleContext === 'date' ? `
      DATE NIGHT STYLE RULES:
      - MUST be stylish and elegant
      - Avoid overly casual items (no sweatpants, athletic wear)
      - Balance sophistication with comfort
      - Appropriate accessories to elevate the look
      ` : ''}
      
      ${weatherData ? `
      CURRENT WEATHER CONDITIONS:
      - Temperature: ${weatherData.temperature}°C
      - Condition: ${weatherData.condition} (${weatherData.description})
      - Humidity: ${weatherData.humidity}%
      - Wind Speed: ${weatherData.windSpeed} m/s
      
      WEATHER-BASED LAYERING REQUIREMENTS:
      ${weatherData.temperature > 20 ? '- HOT WEATHER (>20°C): Use ONLY ONE light layer (t-shirt or tank-top). NO warm layers like sweater/hoodie. Outer jacket only if needed for style.' : ''}
      ${weatherData.temperature >= 10 && weatherData.temperature <= 20 ? '- MILD WEATHER (10-20°C): Use base layer + ONE warm layer (sweater OR hoodie). Outer jacket optional.' : ''}
      ${weatherData.temperature < 10 ? '- COLD WEATHER (<10°C): Layering allowed: base + warm + outer (e.g., t-shirt + sweater + coat).' : ''}
      ${weatherData.condition.toLowerCase().includes('rain') ? '- RAINY: Prioritize waterproof outerwear (rain-jacket) if available. Suggest practical footwear.' : ''}
      ${weatherData.condition.toLowerCase().includes('snow') ? '- SNOWY: Include warm boots and heavy outerwear. Base + warm + outer layers essential.' : ''}
      ` : ''}

      ${userPreferences ? `
      USER PROFILE & PREFERENCES:
      ${userPreferences.body_type ? `- Body Type: ${userPreferences.body_type} - Consider fit recommendations for this body type` : ''}
      ${userPreferences.style_preferences && userPreferences.style_preferences.length > 0 ? `- Preferred Styles: ${userPreferences.style_preferences.join(', ')} - Try to match these style preferences when possible` : ''}
      ${userPreferences.favorite_colors && userPreferences.favorite_colors.length > 0 ? `- Favorite Colors: ${userPreferences.favorite_colors.join(', ')} - Prioritize these colors when creating color harmony` : ''}
      ` : ''}
      
      DIVERSITY & CREATIVITY INSTRUCTIONS:
      1. AVOID RECENTLY USED ITEMS: These item IDs were used in recent outfits, try to select different items: ${recentItemIds.slice(0, 10).join(', ') || 'none'}
      2. EXPLORE THE WARDROBE: Don't always pick the "safest" items - mix unexpected combinations that still follow fashion rules
      3. VARY YOUR SELECTIONS: Even for similar prompts, select different color combinations and styles
      4. BE CREATIVE: Use the Pinterest trends as inspiration but interpret them uniquely with available clothes
      ${attempt > 1 ? '5. PREVIOUS ATTEMPT FAILED: Try a completely different combination than before' : ''}

      ${selectedItem ? `
      ⚠️ CRITICAL REQUIREMENT - SELECTED ITEMS OVERRIDE ALL STYLE RULES:
      The user has specifically selected ${Array.isArray(selectedItem) ? `${selectedItem.length} items` : '1 item'} to build the outfit around.
      
      🔴 IMPORTANT: These selected items MUST be included even if they don't match the ${styleContext} style context.
      The user's choice ALWAYS takes priority over style guidelines and exclusion rules.
      
      ${Array.isArray(selectedItem) ? 
        `SELECTED ITEMS (ALL MUST BE INCLUDED):
        ${selectedItem.map((item: any, idx: number) => `
        Item ${idx + 1}:
        - Category: ${item.category}
        - Color: ${item.color || 'Not specified'}
        - Style: ${item.style || 'Not specified'}
        - Brand: ${item.brand || 'Not specified'}
        - Image URL: ${item.image_url}
        - Item ID: ${item.id}
        `).join('\n')}
        
        MULTI-SELECT REQUIREMENTS:
        1. MANDATORY: Include ALL ${selectedItem.length} selected items in the final outfit (mark each with "is_selected": true)
        2. If selected items conflict with ${styleContext} style, BUILD AROUND THEM ANYWAY
        3. Select complementary pieces that bridge the gap between selected items and ${styleContext} style
        4. Think step-by-step: Analyze each selected item and ensure they work together
        5. Add matching accessories, outerwear, or footwear as needed from the rest of the wardrobe
        6. Explain in your reasoning how you adapted the outfit to include the selected items despite style context
        ` 
        : 
        `SELECTED ITEM:
        - Category: ${selectedItem.category}
        - Color: ${selectedItem.color || 'Not specified'}
        - Style: ${selectedItem.style || 'Not specified'}
        - Brand: ${selectedItem.brand || 'Not specified'}
        - Image URL: ${selectedItem.image_url}
        - Item ID: ${selectedItem.id}
        
        SINGLE ITEM REQUIREMENTS:
        1. ALWAYS include this selected item in the final outfit (mark it with "is_selected": true)
        2. If this item conflicts with ${styleContext} style, INCLUDE IT ANYWAY and build around it
        3. Build the ENTIRE outfit to complement and highlight this item
        4. Choose colors, styles, and accessories that work harmoniously with this piece
        5. Explain in your reasoning how you adapted the outfit to include this item despite style context
        `}
      ` : ''}

      ${boardInspiration.length > 0 ? `
      PINTEREST BOARD ANALYSIS (User's Personal Board):
      The user has connected their personal Pinterest board. Analyze these pins for style preferences:
      ${JSON.stringify(boardInspiration.map((pin: any) => ({
        title: pin.title,
        description: pin.description,
        imageUrl: pin.imageUrl,
        dominantColor: pin.dominantColor
      })))}
      
      INSTRUCTIONS FOR BOARD-INSPIRED OUTFITS:
      - Identify common themes, colors, and styles from the board pins
      - Match the aesthetic and vibe shown in the Pinterest images
      - Use the dominant colors and style patterns as guidance
      - Create an outfit that reflects the user's Pinterest taste using their actual wardrobe
      ` : ''}

      ANALYZE AND COMBINE:
      1. ${boardInspiration.length > 0 ? 'Start by analyzing the Pinterest board pins to understand user preferences' : 'Review available clothes by colors, styles, and categories'}
      2. ${pinterestTrends.length > 0 || boardInspiration.length > 0 ? 'Use Pinterest data for inspiration but interpret creatively' : 'Focus on creating harmonious combinations'}
      3. Select exactly one item per category for a harmonious outfit
      4. Prioritize items NOT in the recent list for freshness

      CRITICAL LAYERING RULES - YOU MUST FOLLOW THESE EXACTLY:

      CATEGORY RULES:
      1. TOPS - You can select MULTIPLE tops if they follow layering logic:
         - Base layers: t-shirt, tank-top, blouse, shirt, long-sleeve (lightweight)
         - Warm layers: sweater, hoodie, cardigan (medium warmth)
         - You can combine: base + warm (e.g., t-shirt + sweater) ✅
         - You can combine: base + warm + outer (e.g., t-shirt + hoodie + jacket) ✅
         
      2. OUTERWEAR - Can be combined with tops:
         - Outer layers: jacket, coat, blazer, rain-jacket, vest
         - You can combine: warm layer + outer (e.g., sweater + coat) ✅
         - You can combine: base + outer (e.g., t-shirt + jacket) ✅

      FORBIDDEN COMBINATIONS (CRITICAL):
      ❌ NEVER: sweater + hoodie without a base layer underneath (too warm!)
      ❌ NEVER: two sweaters or two hoodies
      ❌ NEVER: multiple items of the exact same type (e.g., two t-shirts)

      CORRECT LAYERING EXAMPLES:
      ✅ t-shirt + sweater
      ✅ t-shirt + hoodie
      ✅ t-shirt + sweater + jacket
      ✅ t-shirt + hoodie + coat
      ✅ sweater + jacket (OK without base in cold weather)
      ✅ hoodie + coat (OK without base in cold weather)

      3. OTHER CATEGORIES:
         - Select AT MOST ONE: bottom, dress, footwear
         - Can select multiple accessories

      4. MINIMUM REQUIREMENTS:
         - Must have: (1 base/warm layer + 1 bottom) OR (1 dress)
         - Optional: outerwear, footwear, accessories
         
      5. ACCESSORY PRIORITY: ${shouldIncludeAccessory ? `MUST include at least one accessory (prefer ${suggestedAccessory}) if available in wardrobe` : `Include accessories in 50% of outfits, preferring ${suggestedAccessory} based on the mood/scenario`}

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
        pinterestTrends.map(trend => trend.title || trend.description || 'trending style').join(', ') : 
        pinterestContext || 'classic styling'}

      ${attempt > 1 ? 'PREVIOUS ATTEMPT FAILED - Fix: Remove duplicates and select exactly one item per category.' : ''}

      CREATIVE STYLING INSTRUCTIONS:
      1. Use your fashion expertise to choose items that complement each other in color, style, and mood
      2. Draw inspiration from Pinterest trends to create modern, trendy combinations
      3. Consider color harmony (complementary, analogous, or monochromatic schemes)
      4. CRITICAL: Match formality levels strictly - ${styleContext} items ONLY
      5. Ensure the outfit is appropriate for the requested mood/occasion: "${prompt}"
      6. ACCESSORY MATCHING: For casual moods, prefer kepsar/caps; for elegant/formal moods, prefer ringar/rings or klockor/watches
      7. Be creative and confident in your choices - select items that create a cohesive, stylish look
      8. If Pinterest trends suggest specific accessory combinations, incorporate them
      9. RANDOMIZE WITHIN STYLE RULES: Don't default to safe combinations - explore colors while respecting ${styleContext} rules
      10. SURPRISE ME: Take calculated fashion risks that still follow ${styleContext} guidelines
      11. VALIDATE EACH ITEM: Before selecting, ask "Does this fit ${styleContext} style?" If no, skip it.
      12. NO STYLE MIXING: Don't mix athletic with formal, casual with business unless explicitly requested

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

      ${boardInspiration.length > 0 ? 'PINTEREST BOARD ATTRIBUTION: Add "Inspired by your Pinterest board" to the description' : ''}
      ${!shouldIncludeAccessory && clothesByCategory.accessories.length > 0 ? 'IMPORTANT: If no accessories are selected, add "Consider adding a keps or ring for extra style!" to styling_tips.' : ''}
    `;
    };

    let outfitRecommendation;

    // Single-attempt generation with retry wrapper (handles transient errors)
    try {
      const outfitPrompt = generateOutfitPrompt(1, false);

      const geminiResponse = await withRetry(
        async () => {
          const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [{ role: 'user', content: outfitPrompt }],
              max_tokens: 8000,
              temperature: 0.8,
            }),
          });

          if (!response.ok) {
            const txt = await response.text();
            logger.error('AI API error', undefined, { status: response.status, error: txt });
            if (response.status === 429) throw new Error('AI_RATE_LIMIT');
            if (response.status === 402) throw new Error('AI_CREDITS_EXHAUSTED');
            throw response;
          }

          return response;
        },
        { maxRetries: 3, initialDelayMs: 1000, maxDelayMs: 10000, logger }
      );

      const geminiData = await geminiResponse.json();

      if (!geminiData.choices || geminiData.choices.length === 0) {
        return new Response(JSON.stringify({ error: 'AI service returned unexpected response. Please try again.' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const choice = geminiData.choices[0];
      const content = choice?.message?.content;
      if (!content) {
        return new Response(JSON.stringify({ error: 'AI service returned invalid response. Please try again.' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Extract JSON (supports markdown-wrapped JSON)
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1].trim() : content.trim();
      outfitRecommendation = JSON.parse(jsonText);

      // Validate structure
      if (!outfitRecommendation.items || !Array.isArray(outfitRecommendation.items)) {
        return new Response(JSON.stringify({ error: 'Could not generate a valid outfit. Please try again.' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const categories = outfitRecommendation.items.map((i: any) => i.category);
      const uniqueCategories = new Set(categories);
      if (categories.length !== uniqueCategories.size) {
        return new Response(JSON.stringify({ error: 'Could not generate a valid outfit. Please try again with a different prompt.' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (selectedItem) {
        const selectedItemIds = Array.isArray(selectedItem) ? selectedItem.map((i: any) => i.id) : [selectedItem.id];
        const outfitItemIds = outfitRecommendation.items.map((i: any) => i.item_id);
        const allSelectedIncluded = selectedItemIds.every((id: string) => outfitItemIds.includes(id));
        if (!allSelectedIncluded) {
          return new Response(JSON.stringify({ error: 'Could not create an outfit with your selected items. Try different items.' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      const hasTop = categories.includes('top');
      const hasBottom = categories.includes('bottom');
      const hasDress = categories.includes('dress');
      if (!(hasTop && hasBottom) && !hasDress) {
        return new Response(JSON.stringify({ error: 'Could not create a complete outfit with available items. Try adding more clothes.' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Basic layering validation
      const itemNames = outfitRecommendation.items.map((i: any) => (i.item_name || i.category || '').toLowerCase());
      const sweaterCount = itemNames.filter((c: string) => c.includes('sweater')).length;
      const hoodieCount = itemNames.filter((c: string) => c.includes('hoodie')).length;
      const hasBaseLayer = itemNames.some((c: string) => ['t-shirt','tank-top','blouse','shirt','long-sleeve'].some(b => c.includes(b)));
      if (sweaterCount > 1 || hoodieCount > 1 || (sweaterCount >= 1 && hoodieCount >= 1 && !hasBaseLayer)) {
        return new Response(JSON.stringify({ error: 'Could not create a valid outfit combination. Please try again.' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'AI_RATE_LIMIT') {
        return errorResponse(429, 'AI service rate limit exceeded. Please try again later.', 'AI_RATE_LIMIT', undefined, corsHeaders);
      }
      if (msg === 'AI_CREDITS_EXHAUSTED') {
        return errorResponse(402, 'AI service credits exhausted. Please contact support.', 'AI_CREDITS_EXHAUSTED', undefined, corsHeaders);
      }
      return errorResponse(500, 'AI service temporarily unavailable. Please try again.', 'AI_UNAVAILABLE', { message: msg }, corsHeaders);
    }


    // Generate outfit visualization from new structured format
    const selectedItems = validClothes.filter(item => 
      outfitRecommendation.items.some(outfitItem => outfitItem.item_id === item.id)
    );
    
    const outfitVisualization = {
      items: selectedItems.map(item => {
        // Calculate style_score based on style context match
        const itemCategory = (item.category || '').toLowerCase();
        const itemStyle = (item.analysis?.style || '').toLowerCase();
        
        // Calculate score based on how well item matches the style context
        let styleScore = 0.5; // Default
        
        // Check if item is in allowed list
        const isAllowed = contextRules.allowed.some(allowed => 
          itemCategory.includes(allowed.toLowerCase()) || 
          itemStyle.includes(allowed.toLowerCase())
        );
        
        // Check if item matches priority styles
        const matchesPriority = contextRules.priority.some(priority => 
          itemStyle.includes(priority.toLowerCase())
        );
        
        if (isAllowed && matchesPriority) {
          styleScore = 0.9; // Perfect match
        } else if (isAllowed) {
          styleScore = 0.7; // Good match
        } else if (matchesPriority) {
          styleScore = 0.6; // Style match but not explicitly allowed
        }
        
        return {
          id: item.id,
          category: item.category,
          main_category: item.analysis.main_category,
          color: item.analysis.color,
          image_url: item.image_url,
          style_score: styleScore
        };
      }),
      description: `${selectedItems.map(item => 
        `${item.analysis.color} ${item.category}`
      ).join(' + ')}`,
      color_scheme: outfitRecommendation.color_harmony || 'harmonious color combination'
    };

    // Convert new format to legacy format for database compatibility
    const legacyRecommendedItems = outfitRecommendation.items.map(item => item.item_id);

    // Step 3: Generate AI Hero Image (only if requested)
    let generatedImageUrl = null;
    
    if (generateImage) {
      console.log('Generating AI hero image with Gemini (user requested)...');
      try {
        // Build image prompt based on outfit
        const itemDescriptions = selectedItems.map(item => 
          `${item.analysis.color} ${item.category}`
        ).join(', ');
        
        const imagePrompt = `Professional fashion photograph of a neutral mannequin wearing ${itemDescriptions}. 
The outfit should look elegant and well-styled. Studio lighting with soft shadows, clean neutral gray background, 
front-facing 3/4 view. The mannequin should have a neutral pose showing off the complete outfit. 
High fashion photography style, editorial quality, 4K resolution. 
Mood: ${mood || 'stylish and modern'}. 
The outfit conveys: ${outfitRecommendation.description}`;

        console.log('Image generation prompt:', imagePrompt);

        const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [{
              role: 'user',
              content: imagePrompt
            }],
            modalities: ['image', 'text']
          }),
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          const base64Image = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          
          if (base64Image) {
            console.log('AI image generated successfully');
            
            // Upload to Supabase Storage
            const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
            const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            
            const fileName = `outfit_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('clothes')
              .upload(`generated-outfits/${fileName}`, imageBuffer, {
                contentType: 'image/png',
                upsert: false
              });

            if (uploadError) {
              console.error('Failed to upload generated image:', uploadError);
            } else {
              const { data: urlData } = supabase.storage
                .from('clothes')
                .getPublicUrl(`generated-outfits/${fileName}`);
              
              generatedImageUrl = urlData.publicUrl;
              console.log('Generated image uploaded:', generatedImageUrl);
            }
          }
        } else {
          console.warn('Image generation failed:', imageResponse.status, await imageResponse.text());
        }
      } catch (imageError) {
        console.error('Error generating AI image:', imageError);
        // Continue without image - not critical
      }
    } else {
      console.log('Skipping AI image generation (user opted out - saves ~$0.004)');
    }

    // Save outfit to database
    const { data: savedOutfit, error: saveError } = await supabase
      .from('outfits')
      .insert({
        user_id: userId,
        title: outfitRecommendation.title,
        prompt,
        mood,
        is_public: isPublic,
        generated_image_url: generatedImageUrl,
        description: outfitRecommendation.description,
        recommended_clothes: legacyRecommendedItems,
        purchase_links: purchaseLinks || [],
        ai_analysis: {
          styling_tips: outfitRecommendation.styling_tips,
          occasion: outfitRecommendation.perfect_for,
          color_harmony: outfitRecommendation.color_harmony,
          pinterest_trends: pinterestTrends.slice(0, 2),
          clothes_analysis: validClothes,
          outfit_visualization: outfitVisualization,
          structured_items: outfitRecommendation.items, // New structured format
          style_context: styleContext,
          used_pinterest_trends: (pinterestTrends.length > 0 || boardInspiration.length > 0)
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save outfit to database:', saveError);
      return new Response(JSON.stringify({ 
        error: 'Outfit was generated but could not be saved. Please try again.' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Outfit generated and saved successfully');

    // Trigger automatic texture generation for all clothes items (async, don't wait)
    if (legacyRecommendedItems && legacyRecommendedItems.length > 0) {
      console.log('Starting automatic texture generation for', legacyRecommendedItems.length, 'outfit items');
      
      // Fetch selected clothes items to get their image URLs and categories
      const { data: outfitClothes, error: clothesError } = await supabase
        .from('clothes')
        .select('id, image_url, category, texture_maps')
        .in('id', legacyRecommendedItems);

      if (clothesError) {
        console.error('Failed to fetch outfit clothes for texture generation:', clothesError);
      } else if (outfitClothes) {
        // Trigger texture generation only for items that don't have texture maps yet
        for (const item of outfitClothes) {
          // Skip if texture maps already exist
          if (item.texture_maps) {
            console.log('Texture maps already exist for item:', item.id);
            continue;
          }
          
          console.log('Triggering texture generation for item:', item.id, item.category);
          
          // Call generate-texture-maps function asynchronously (fire and forget)
          supabase.functions.invoke('generate-texture-maps', {
            body: {
              imageUrl: item.image_url,
              clothingType: item.category
            }
          }).then(({ data: textureMaps, error: textureError }) => {
            if (textureError) {
              console.error('Texture generation failed for item', item.id, ':', textureError);
            } else if (textureMaps) {
              console.log('Texture maps generated for item', item.id);
              
              // Update the clothes item with texture maps
              supabase
                .from('clothes')
                .update({ texture_maps: textureMaps })
                .eq('id', item.id)
                .then(({ error: updateError }) => {
                  if (updateError) {
                    console.error('Failed to save texture maps for item', item.id, ':', updateError);
                  } else {
                    console.log('Texture maps saved successfully for item', item.id);
                  }
                });
            }
          }).catch(err => {
            console.error('Texture generation exception for item', item.id, ':', err);
          });
        }
      }
    }

    const responsePayload = {
      outfit: savedOutfit,
      recommendedClothes: selectedItems,
      structuredOutfit: outfitRecommendation,
    };
    const responseMeta = {
      processingTimeMs: Date.now() - startTime,
      clothesAnalyzed: clothes.length,
      pinterestTrendsUsed: (pinterestTrends.length > 0) || (boardInspiration.length > 0),
      imageGenerated: !!generatedImageUrl,
    };

    return successResponse(responsePayload, responseMeta, corsHeaders);


});