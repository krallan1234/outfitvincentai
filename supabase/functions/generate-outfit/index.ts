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
const MAX_REQUESTS = 5; // 5 outfit generations per minute (stricter limit)

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

// Generate cache key from prompt, userId, and mood
const generateCacheKey = async (prompt: string, userId: string, mood?: string): Promise<string> => {
  const cacheString = `${prompt.trim().toLowerCase()}:${userId}:${mood || 'none'}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(cacheString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
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
      'Rate limit exceeded. You can only generate 5 outfits per minute. Please wait before trying again.',
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

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate cache key
    const cacheKey = await generateCacheKey(prompt, userId, mood);
    logger.info('Cache key generated', { cacheKey: cacheKey.substring(0, 16) + '...' });

    // Check cache first (only if no specific items are selected)
    if (!selectedItem) {
      logger.info('Checking cache for existing outfit...');
      const { data: cachedOutfit, error: cacheError } = await supabase
        .from('outfit_generation_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!cacheError && cachedOutfit) {
        logger.info('Cache hit! Returning cached outfit', { 
          cacheAge: Date.now() - new Date(cachedOutfit.created_at).getTime(),
          hitCount: cachedOutfit.hit_count 
        });

        // Increment hit count
        await supabase
          .from('outfit_generation_cache')
          .update({ hit_count: cachedOutfit.hit_count + 1 })
          .eq('id', cachedOutfit.id);

        // Return cached result
        const cachedResponse = cachedOutfit.outfit_data as any;
        return successResponse(
          {
            ...cachedResponse,
            fromCache: true,
            cacheAge: Date.now() - new Date(cachedOutfit.created_at).getTime(),
          },
          {
            processingTimeMs: Date.now() - startTime,
            fromCache: true,
            cacheHitCount: cachedOutfit.hit_count + 1,
          },
          corsHeaders
        );
      }

      logger.info('Cache miss, proceeding with AI generation');
    } else {
      logger.info('Cache skipped due to selected items');
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

    // Fetch user profile from database to get complete preferences
    console.log('Fetching user profile from database...');
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('body_type, style_preferences, favorite_colors, location, gender, skin_tone')
      .eq('user_id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      logger.error('Failed to fetch user profile', profileError);
    }

    // Merge user preferences from request with database profile
    const completeUserPreferences = {
      ...(userPreferences || {}),
      ...(userProfile || {})
    };

    logger.info('User profile loaded', {
      hasBodyType: !!completeUserPreferences.body_type,
      hasGender: !!completeUserPreferences.gender,
      hasSkinTone: !!completeUserPreferences.skin_tone,
      hasStylePreferences: !!completeUserPreferences.style_preferences,
      hasFavoriteColors: !!completeUserPreferences.favorite_colors,
      hasLocation: !!completeUserPreferences.location,
    });

    // Fetch user's liked outfits for personalization
    console.log('Fetching previously liked outfits...');
    const { data: likedOutfits, error: likesError } = await supabase
      .from('outfit_likes')
      .select(`
        outfit_id,
        outfits (
          id,
          mood,
          ai_analysis,
          recommended_clothes
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (likesError) {
      logger.error('Failed to fetch liked outfits', likesError);
    }

    const likedOutfitAnalysis = likedOutfits?.map((like: any) => ({
      mood: like.outfits?.mood,
      style_context: like.outfits?.ai_analysis?.style_context,
      colors: like.outfits?.ai_analysis?.color_harmony,
      occasion: like.outfits?.ai_analysis?.occasion,
    })).filter((item: any) => item.mood || item.style_context) || [];

    logger.info(`Found ${likedOutfitAnalysis.length} liked outfits for personalization`);

    // Fetch weather data from Open-Meteo if location is available and no weather provided
    let finalWeatherData = weatherData;
    if (!finalWeatherData && completeUserPreferences.location) {
      console.log('Fetching weather from Open-Meteo for location:', completeUserPreferences.location);
      try {
        const weatherResponse = await supabase.functions.invoke('fetch-weather-open-meteo', {
          body: { location: completeUserPreferences.location }
        });

        if (weatherResponse.error) {
          logger.error('Failed to fetch weather from Open-Meteo', weatherResponse.error);
        } else if (weatherResponse.data) {
          finalWeatherData = weatherResponse.data;
          logger.info('Weather data fetched from Open-Meteo', {
            temperature: finalWeatherData?.temperature,
            condition: finalWeatherData?.condition
          });
        }
      } catch (weatherError) {
        logger.error('Exception fetching weather', weatherError);
      }
    }

    // Extract selected item IDs for filtering logic
    const selectedItemIds = selectedItem 
      ? (Array.isArray(selectedItem) 
          ? selectedItem.map((item: any) => item.id)
          : [selectedItem.id])
      : [];

    logger.info('Starting outfit generation', {
      userId,
      weatherData: finalWeatherData ? `${finalWeatherData.temperature}°C, ${finalWeatherData.condition}` : 'Not provided',
      userPreferences: completeUserPreferences ? 'Provided' : 'Not provided',
      selectedItemsCount: selectedItemIds.length,
      likedOutfitsCount: likedOutfitAnalysis.length,
    });

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

    // STEP 1: Classify user prompt
    const classifyPrompt = async () => {
      const classificationPrompt = `You are a fashion classification expert. Analyze the following user request and classify it.

USER REQUEST: "${prompt}"
MOOD: ${mood || 'not specified'}
${finalWeatherData ? `WEATHER: ${finalWeatherData.temperature}°C, ${finalWeatherData.condition}` : ''}

USER PROFILE:
${completeUserPreferences.gender ? `- Gender: ${completeUserPreferences.gender}` : ''}
${completeUserPreferences.body_type ? `- Body Type: ${completeUserPreferences.body_type}` : ''}
${completeUserPreferences.skin_tone ? `- Skin Tone: ${completeUserPreferences.skin_tone}` : ''}

STYLE HISTORY (Previously liked outfits):
${likedOutfitAnalysis.length > 0 ? JSON.stringify(likedOutfitAnalysis.slice(0, 5)) : 'No previous likes'}

Classify this request into:
1. OCCASION: (casual, formal, business, athletic, date, party, travel, other)
2. STYLE: (elegant, sporty, minimalist, bohemian, edgy, romantic, streetwear, professional)
3. SEASON: (spring, summer, fall, winter, all-season)
4. FORMALITY_LEVEL: (very_casual, casual, smart_casual, semi_formal, formal, very_formal)
5. COLOR_PREFERENCE: Infer from prompt if any colors mentioned, also consider user's favorite colors
6. WEATHER_CONSIDERATION: How important is weather (low, medium, high)
7. PERSONALIZATION_NOTES: Based on user's profile and style history, what should be emphasized

Return ONLY valid JSON:
{
  "occasion": "...",
  "style": "...",
  "season": "...",
  "formality_level": "...",
  "color_preference": ["color1", "color2"] or null,
  "weather_consideration": "...",
  "personalization_notes": "..."
}`;

      const response = await withRetry(
        async () => {
          const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [{ role: 'user', content: classificationPrompt }],
              max_tokens: 500,
              temperature: 0.4,
            }),
          });
          if (!res.ok) {
            const txt = await res.text();
            logger.error('Classification API error', undefined, { status: res.status, error: txt });
            if (res.status === 429) throw new Error('AI_RATE_LIMIT');
            if (res.status === 402) throw new Error('AI_CREDITS_EXHAUSTED');
            throw res;
          }
          return res;
        },
        { maxRetries: 3, initialDelayMs: 1000, maxDelayMs: 10000, logger }
      );

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1].trim() : content.trim();
      return JSON.parse(jsonText);
    };

    // STEP 2: Generate outfit requirements specification
    const generateRequirements = async (classification: any) => {
      const requirementsPrompt = `You are a fashion requirements expert. Based on the classification and user profile, create a detailed requirements specification.

CLASSIFICATION:
${JSON.stringify(classification, null, 2)}

USER REQUEST: "${prompt}"
${finalWeatherData ? `WEATHER: ${finalWeatherData.temperature}°C, ${finalWeatherData.condition}, ${finalWeatherData.humidity}% humidity` : ''}

USER PROFILE:
${completeUserPreferences.gender ? `- Gender: ${completeUserPreferences.gender}` : ''}
${completeUserPreferences.body_type ? `- Body Type: ${completeUserPreferences.body_type}` : ''}
${completeUserPreferences.skin_tone ? `- Skin Tone: ${completeUserPreferences.skin_tone}` : ''}
${completeUserPreferences.style_preferences ? `- Style Preferences: ${JSON.stringify(completeUserPreferences.style_preferences)}` : ''}
${completeUserPreferences.favorite_colors ? `- Favorite Colors: ${JSON.stringify(completeUserPreferences.favorite_colors)}` : ''}

STYLE HISTORY (What user has liked before):
${likedOutfitAnalysis.length > 0 ? JSON.stringify(likedOutfitAnalysis) : 'No previous style history'}

Create a detailed requirements specification for the outfit including:
1. REQUIRED_CATEGORIES: Which clothing categories must be included (top, bottom, dress, outerwear, footwear, accessories)
2. OPTIONAL_CATEGORIES: Which categories are optional but recommended
3. COLOR_PALETTE: Recommended colors based on season, occasion, user preferences, and skin tone
4. MATERIAL_REQUIREMENTS: Fabric types suitable for weather and occasion
5. STYLE_RULES: Specific styling guidelines for this classification and user's body type
6. LAYERING_STRATEGY: How to layer clothes based on weather
7. FORMALITY_CONSTRAINTS: What to avoid or prioritize
8. PERSONALIZATION: How to adapt to user's gender, body type, and style preferences

Return ONLY valid JSON:
{
  "required_categories": ["category1", "category2"],
  "optional_categories": ["category1"],
  "color_palette": {
    "primary": ["color1", "color2"],
    "accent": ["color1"],
    "avoid": ["color1"],
    "skin_tone_recommendations": "colors that complement user's skin tone"
  },
  "material_requirements": {
    "preferred": ["material1", "material2"],
    "avoid": ["material1"]
  },
  "style_rules": ["rule1", "rule2"],
  "layering_strategy": "description",
  "formality_constraints": {
    "must_include": ["item1"],
    "must_avoid": ["item1"]
  },
  "personalization": {
    "body_type_tips": "fit recommendations",
    "gender_considerations": "styling notes",
    "style_history_influence": "what to emphasize based on likes"
  }
}`;

      const response = await withRetry(
        async () => {
          const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [{ role: 'user', content: requirementsPrompt }],
              max_tokens: 1000,
              temperature: 0.4,
            }),
          });
           if (!res.ok) {
            const txt = await res.text();
            logger.error('Requirements API error', undefined, { status: res.status, error: txt });
            if (res.status === 429) throw new Error('AI_RATE_LIMIT');
            if (res.status === 402) throw new Error('AI_CREDITS_EXHAUSTED');
            throw res;
          }
          return res;
        },
        { maxRetries: 3, initialDelayMs: 1000, maxDelayMs: 10000, logger }
      );

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1].trim() : content.trim();
      return JSON.parse(jsonText);
    };

    // STEP 3: Generate and score outfit candidates
    const generateAndScoreOutfits = async (classification: any, requirements: any) => {
      const generateOutfitPrompt = `
You are a professional fashion stylist. Generate 3 different outfit candidates based on requirements.

CLASSIFICATION:
${JSON.stringify(classification, null, 2)}

REQUIREMENTS:
${JSON.stringify(requirements, null, 2)}

USER REQUEST: "${prompt}"
${mood ? `MOOD: ${mood}` : ''}
${finalWeatherData ? `WEATHER: ${finalWeatherData.temperature}°C, ${finalWeatherData.condition}` : ''}

USER PROFILE:
${completeUserPreferences.gender ? `- Gender: ${completeUserPreferences.gender}` : ''}
${completeUserPreferences.body_type ? `- Body Type: ${completeUserPreferences.body_type} - Consider flattering fits` : ''}
${completeUserPreferences.skin_tone ? `- Skin Tone: ${completeUserPreferences.skin_tone} - Choose colors that complement` : ''}
${completeUserPreferences.style_preferences ? `- Preferred Styles: ${JSON.stringify(completeUserPreferences.style_preferences)}` : ''}
${completeUserPreferences.favorite_colors ? `- Favorite Colors: ${JSON.stringify(completeUserPreferences.favorite_colors)} - Try to incorporate` : ''}

STYLE HISTORY (Previously liked):
${likedOutfitAnalysis.length > 0 ? `User tends to like: ${JSON.stringify(likedOutfitAnalysis.slice(0, 3))}` : 'No previous style preferences'}

${selectedItem ? `
CRITICAL: User selected items MUST be included:
${JSON.stringify(selectedItem, null, 2)}
` : ''}

${pinterestTrends.length > 0 ? `
PINTEREST INSPIRATION:
${JSON.stringify(pinterestTrends.slice(0, 3))}
` : ''}

AVOID RECENT ITEMS: ${recentItemIds.slice(0, 10).join(', ') || 'none'}

AVAILABLE WARDROBE:
TOPS: ${JSON.stringify(clothesByCategory.top.map(item => ({
  id: item.id,
  category: item.category,
  color: item.analysis.color,
  style: item.analysis.style
})))}

BOTTOMS: ${JSON.stringify(clothesByCategory.bottom.map(item => ({
  id: item.id,
  category: item.category,
  color: item.analysis.color,
  style: item.analysis.style
})))}

DRESSES: ${JSON.stringify(clothesByCategory.dress.map(item => ({
  id: item.id,
  category: item.category,
  color: item.analysis.color,
  style: item.analysis.style
})))}

OUTERWEAR: ${JSON.stringify(clothesByCategory.outerwear.map(item => ({
  id: item.id,
  category: item.category,
  color: item.analysis.color,
  style: item.analysis.style
})))}

FOOTWEAR: ${JSON.stringify(clothesByCategory.footwear.map(item => ({
  id: item.id,
  category: item.category,
  color: item.analysis.color,
  style: item.analysis.style
})))}

ACCESSORIES: ${JSON.stringify(clothesByCategory.accessories.map(item => ({
  id: item.id,
  category: item.category,
  color: item.analysis.color,
  style: item.analysis.style
})))}

Generate 3 DIFFERENT outfit candidates. For each candidate, provide reasoning and scoring.

Return ONLY valid JSON array:
[
  {
    "outfit": {
      "title": "Outfit name",
      "items": [
        {
          "item_id": "uuid",
          "category": "top",
          "item_name": "Item name",
          "color": "color",
          "style": "style"
        }
      ],
      "description": "Why this works",
      "color_harmony": "Color analysis",
      "styling_tips": ["tip1", "tip2"]
    },
    "reasoning": "Detailed explanation: Why each item was chosen, how they work together, weather considerations, style matching",
    "score": 0.0,
    "score_breakdown": {
      "style_match": 0.0,
      "weather_appropriateness": 0.0,
      "color_harmony": 0.0,
      "requirements_fulfillment": 0.0
    }
  }
]`;

      const response = await withRetry(
        async () => {
          const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'system',
                  content: `You are an expert fashion stylist. Follow these rules:
1. COLOR MATCHING: Use complementary, analogous, or monochromatic color schemes
2. WEATHER: Cold (<10°C) = layers; Mild (10-20°C) = light layers; Hot (>20°C) = single light layer
3. STYLE CONSISTENCY: All items must match the formality level and style context
4. LAYERING: Base → Warm → Outer. Never double warm layers without base.
5. SCORING: Be critical and realistic. Perfect match = 0.9+, Good = 0.7-0.9, Acceptable = 0.5-0.7, Poor = <0.5`
                },
                { role: 'user', content: generateOutfitPrompt }
              ],
              max_tokens: 8000,
              temperature: 0.4,
            }),
          });
          if (!res.ok) {
            const txt = await res.text();
            logger.error('Outfit generation API error', undefined, { status: res.status, error: txt });
            if (res.status === 429) throw new Error('AI_RATE_LIMIT');
            if (res.status === 402) throw new Error('AI_CREDITS_EXHAUSTED');
            throw res;
          }
          return res;
        },
        { maxRetries: 3, initialDelayMs: 1000, maxDelayMs: 10000, logger }
      );

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '[]';
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1].trim() : content.trim();
      return JSON.parse(jsonText);
    };

    // STEP 4: Select best outfit
    logger.info('Starting flerstegs-pipeline...');
    
    let classification, requirements, candidates, bestOutfit;
    
    try {
      // Step 1: Classify
      logger.info('Step 1: Klassificerar prompt...');
      classification = await classifyPrompt();
      logger.info('Classification:', classification);

      // Step 2: Requirements
      logger.info('Step 2: Genererar kravspecifikation...');
      requirements = await generateRequirements(classification);
      logger.info('Requirements:', requirements);

      // Step 3: Generate and score candidates
      logger.info('Step 3: Genererar och scorear outfit-kandidater...');
      candidates = await generateAndScoreOutfits(classification, requirements);
      
      if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
        throw new Error('No valid outfit candidates generated');
      }
      
      logger.info(`Generated ${candidates.length} candidates`);

      // Step 4: Select best based on score
      bestOutfit = candidates.reduce((best, current) => 
        (current.score || 0) > (best.score || 0) ? current : best
      );
      
      logger.info('Best outfit selected:', { 
        score: bestOutfit.score,
        title: bestOutfit.outfit?.title 
      });

      // Validate best outfit structure
      if (!bestOutfit.outfit?.items || !Array.isArray(bestOutfit.outfit.items)) {
        throw new Error('Best outfit has invalid structure');
      }

      // Validate selected items are included if any
      if (selectedItem) {
        const selectedIds = Array.isArray(selectedItem) 
          ? selectedItem.map((i: any) => i.id) 
          : [selectedItem.id];
        const outfitIds = bestOutfit.outfit.items.map((i: any) => i.item_id);
        const allIncluded = selectedIds.every((id: string) => outfitIds.includes(id));
        
        if (!allIncluded) {
          return errorResponse(
            400,
            'Could not create outfit with selected items',
            'SELECTED_ITEMS_NOT_INCLUDED',
            undefined,
            corsHeaders
          );
        }
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Pipeline error', err);
      
      if (msg === 'AI_RATE_LIMIT') {
        return errorResponse(429, 'AI service rate limit exceeded.', 'AI_RATE_LIMIT', undefined, corsHeaders);
      }
      if (msg === 'AI_CREDITS_EXHAUSTED') {
        return errorResponse(402, 'AI service credits exhausted.', 'AI_CREDITS_EXHAUSTED', undefined, corsHeaders);
      }
      
      return errorResponse(
        500, 
        'Failed to generate outfit. Please try again.', 
        'PIPELINE_ERROR',
        { error: msg },
        corsHeaders
      );
    }


    // Generate outfit visualization from new structured format
    const selectedItems = validClothes.filter(item => 
      bestOutfit.outfit.items.some(outfitItem => outfitItem.item_id === item.id)
    );
    
    const outfitVisualization = {
      items: selectedItems.map(item => ({
        id: item.id,
        category: item.category,
        main_category: item.analysis.main_category,
        color: item.analysis.color,
        image_url: item.image_url,
        style_score: bestOutfit.score_breakdown?.style_match || 0.5
      })),
      description: `${selectedItems.map(item => 
        `${item.analysis.color} ${item.category}`
      ).join(' + ')}`,
      color_scheme: bestOutfit.outfit.color_harmony || 'harmonious color combination'
    };

    // Convert new format to legacy format for database compatibility
    const legacyRecommendedItems = bestOutfit.outfit.items.map(item => item.item_id);

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
The outfit conveys: ${bestOutfit.outfit.description}`;

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
        title: bestOutfit.outfit.title,
        prompt,
        mood,
        is_public: isPublic,
        generated_image_url: generatedImageUrl,
        description: bestOutfit.outfit.description,
        recommended_clothes: legacyRecommendedItems,
        purchase_links: purchaseLinks || [],
        ai_analysis: {
          styling_tips: bestOutfit.outfit.styling_tips,
          occasion: bestOutfit.outfit.perfect_for || classification.occasion,
          color_harmony: bestOutfit.outfit.color_harmony,
          pinterest_trends: pinterestTrends.slice(0, 2),
          clothes_analysis: validClothes,
          outfit_visualization: outfitVisualization,
          structured_items: bestOutfit.outfit.items,
          style_context: classification.style,
          classification: classification,
          requirements: requirements,
          reasoning: bestOutfit.reasoning,
          score: bestOutfit.score,
          score_breakdown: bestOutfit.score_breakdown,
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

    // Save to cache (only if no specific items were selected)
    if (!selectedItem) {
      logger.info('Saving outfit to cache...');
      try {
        const cacheExpiry = new Date();
        cacheExpiry.setHours(cacheExpiry.getHours() + 24); // Cache for 24 hours

        const { error: cacheInsertError } = await supabase
          .from('outfit_generation_cache')
          .insert({
            cache_key: cacheKey,
            user_id: userId,
            prompt: prompt,
            mood: mood || null,
            outfit_data: {
              outfit: savedOutfit,
              recommendedClothes: selectedItems,
              structuredOutfit: bestOutfit.outfit,
              reasoning: bestOutfit.reasoning,
              score: bestOutfit.score,
              score_breakdown: bestOutfit.score_breakdown,
              classification: classification,
              requirements: requirements,
            },
            expires_at: cacheExpiry.toISOString(),
          });

        if (cacheInsertError) {
          // Log but don't fail the request if cache insertion fails
          logger.error('Failed to save to cache', cacheInsertError);
        } else {
          logger.info('Outfit saved to cache successfully', { expiresAt: cacheExpiry.toISOString() });
        }
      } catch (cacheError) {
        logger.error('Exception while saving to cache', cacheError);
      }
    }

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
      structuredOutfit: bestOutfit.outfit,
      reasoning: bestOutfit.reasoning,
      score: bestOutfit.score,
      score_breakdown: bestOutfit.score_breakdown,
      classification: classification,
      requirements: requirements,
      all_candidates: candidates.map(c => ({
        title: c.outfit.title,
        score: c.score,
        reasoning: c.reasoning
      }))
    };
    const responseMeta = {
      processingTimeMs: Date.now() - startTime,
      clothesAnalyzed: clothes.length,
      pinterestTrendsUsed: (pinterestTrends.length > 0) || (boardInspiration.length > 0),
      imageGenerated: !!generatedImageUrl,
      pipelineSteps: 4,
      candidatesGenerated: candidates.length,
      fromCache: false,
      cached: !selectedItem, // Indicates if this result was saved to cache
    };

    return successResponse(responsePayload, responseMeta, corsHeaders);


});