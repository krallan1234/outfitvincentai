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

// Rate limiting: 5 generations per minute per user
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 5; // 5 outfit generations per minute

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

// Google Gemini API configuration
const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
const geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Lovable AI Gateway fallback (serves Google Gemini via gateway)
const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
const lovableAiUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';

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
    if (!geminiApiKey) {
      logger.error('Google Gemini API key not configured');
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

    // Helper function to call Gemini with structured JSON output
    const callGeminiStructured = async (prompt: string, schema: any, temperature = 0.4) => {
      const response = await withRetry(
        async () => {
          const res = await fetch(`${geminiApiUrl}?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                response_mime_type: 'application/json',
                response_schema: schema,
                temperature,
              }
            })
          });
          
          if (!res.ok) {
            const txt = await res.text();
            logger.error('Gemini API error', undefined, { status: res.status, error: txt });
            if (res.status === 429) throw new Error('AI_RATE_LIMIT');
            throw res;
          }
          return res;
        },
        { maxRetries: 3, initialDelayMs: 1000, maxDelayMs: 10000, logger }
      ).catch(async (err) => {
        // Fallback to Lovable AI Gateway if direct Gemini fails
        if (!lovableApiKey) throw err;
        logger.warn('Falling back to Lovable AI Gateway (google/gemini-2.5-flash) due to Gemini error');
        const fallback = await fetch(lovableAiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Return ONLY valid JSON for the function call. No prose.' },
              { role: 'user', content: prompt }
            ],
            tools: [
              {
                type: 'function',
                function: {
                  name: 'build_outfit',
                  description: 'Return a structured outfit JSON',
                  parameters: schema,
                }
              }
            ],
            tool_choice: { type: 'function', function: { name: 'build_outfit' } }
          })
        });
        if (!fallback.ok) {
          const t = await fallback.text();
          logger.error('Lovable AI fallback failed', undefined, { status: fallback.status, error: t });
          if (fallback.status === 429) throw new Error('AI_RATE_LIMIT');
          throw new Error('AI_FALLBACK_FAILED');
        }
        
        return new Response(await fallback.text(), { headers: { 'content-type': 'application/json', 'x-used-fallback': 'true' } });
      });

      // Parse response
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) return JSON.parse(jsonText);
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (toolCall) return JSON.parse(toolCall);
        const contentStr = data.choices?.[0]?.message?.content;
        if (contentStr) return JSON.parse(contentStr);
        return {};
      } else {
        const raw = await response.text();
        try {
          const data = JSON.parse(raw);
          const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
          if (toolCall) return JSON.parse(toolCall);
          const contentStr = data.choices?.[0]?.message?.content;
          if (contentStr) return JSON.parse(contentStr);
        } catch (_) {}
        return {};
      }
    };

    // Main outfit generation with Gemini
    const generateOutfitWithGemini = async () => {
      // Build Pinterest inspiration context
      let pinterestInspiration = '';
      if (pinterestContext) {
        pinterestInspiration = `\nPINTEREST TRENDS:\n${pinterestContext}\n`;
        if (pinterestPins && pinterestPins.length > 0) {
          const topPins = pinterestPins.slice(0, 5);
          pinterestInspiration += `\nTOP TRENDING STYLES:\n`;
          topPins.forEach((pin: any, i: number) => {
            pinterestInspiration += `${i + 1}. "${pin.title}" - ${pin.description || 'Trending fashion'}\n`;
            if (pin.dominant_color) pinterestInspiration += `   Color: ${pin.dominant_color}\n`;
          });
        }
      }
      if (boardInspiration) {
        pinterestInspiration += `\nUSER'S PINTEREST BOARD INSPIRATION:\n${boardInspiration}\n`;
      }

      // Build seasonal recommendations based on weather
      let seasonalAdvice = '';
      if (finalWeatherData) {
        const temp = finalWeatherData.temperature;
        if (temp < 10) {
          seasonalAdvice = '\nSEASONAL GUIDANCE: Cold weather - prioritize layering, warm outerwear, closed-toe shoes. Avoid shorts, sandals, sleeveless tops.';
        } else if (temp < 20) {
          seasonalAdvice = '\nSEASONAL GUIDANCE: Cool weather - light layers recommended. Balance warmth and style.';
        } else if (temp < 28) {
          seasonalAdvice = '\nSEASONAL GUIDANCE: Warm weather - breathable fabrics, lighter colors recommended.';
        } else {
          seasonalAdvice = '\nSEASONAL GUIDANCE: Hot weather - prioritize breathable, light fabrics. Avoid heavy layering and dark colors.';
        }
      }

      const fullPrompt = `Generate detailed outfit JSON based on this request: ${prompt}

MOOD: ${mood || 'stylish'}
${finalWeatherData ? `WEATHER: ${finalWeatherData.temperature}°C, ${finalWeatherData.condition}` : ''}
${seasonalAdvice}
${pinterestInspiration}

USER PROFILE:
${completeUserPreferences.gender ? `Gender: ${completeUserPreferences.gender}` : ''}
${completeUserPreferences.style_preferences ? `Style: ${JSON.stringify(completeUserPreferences.style_preferences)}` : ''}
${completeUserPreferences.favorite_colors ? `Favorite Colors: ${JSON.stringify(completeUserPreferences.favorite_colors)}` : ''}

AVAILABLE WARDROBE:
TOPS: ${JSON.stringify(clothesByCategory.top.map(i => ({ id: i.id, category: i.category, color: i.analysis.color })))}
BOTTOMS: ${JSON.stringify(clothesByCategory.bottom.map(i => ({ id: i.id, category: i.category, color: i.analysis.color })))}
DRESSES: ${JSON.stringify(clothesByCategory.dress.map(i => ({ id: i.id, category: i.category, color: i.analysis.color })))}
OUTERWEAR: ${JSON.stringify(clothesByCategory.outerwear.map(i => ({ id: i.id, category: i.category, color: i.analysis.color })))}
FOOTWEAR: ${JSON.stringify(clothesByCategory.footwear.map(i => ({ id: i.id, category: i.category, color: i.analysis.color })))}
ACCESSORIES: ${JSON.stringify(clothesByCategory.accessories.map(i => ({ id: i.id, category: i.category, color: i.analysis.color })))}

${selectedItem ? `MUST INCLUDE: ${JSON.stringify(selectedItem)}` : ''}

RULES:
- ONLY use items from AVAILABLE WARDROBE (use exact IDs)
- Create complete outfit: top+bottom+shoes OR dress+shoes
- Match style to prompt, weather, and Pinterest trends
- Follow seasonal guidance strictly
- Ensure color harmony (complementary or analogous colors)
- Include accessories if available
- Generate imagePrompt for Unsplash`;

      const outfitSchema = {
        type: 'object',
        properties: {
          top: { type: 'string', description: 'UUID of top item or empty string' },
          bottom: { type: 'string', description: 'UUID of bottom item or empty string' },
          dress: { type: 'string', description: 'UUID of dress item or empty string' },
          shoes: { type: 'string', description: 'UUID of shoes item' },
          outerwear: { type: 'string', description: 'UUID of outerwear or empty string' },
          accessories: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Array of accessory UUIDs'
          },
          description: { type: 'string', description: 'Full outfit description' },
          imagePrompt: { type: 'string', description: 'Unsplash image search query' },
          stylingTips: { 
            type: 'array',
            items: { type: 'string' },
            description: 'Styling tips'
          },
          colorHarmony: { type: 'string', description: 'Color analysis' }
        },
        required: ['description', 'imagePrompt', 'stylingTips', 'colorHarmony']
      };

      return await callGeminiStructured(fullPrompt, outfitSchema, 0.5);
    };

    // Process outfit generation result
    const processOutfitResult = (geminiResult: any) => {
      const items: any[] = [];
      const itemMapping = [
        { key: 'top', category: 'top' },
        { key: 'bottom', category: 'bottom' },
        { key: 'dress', category: 'dress' },
        { key: 'shoes', category: 'footwear' },
        { key: 'outerwear', category: 'outerwear' }
      ];

      // Add main items
      for (const { key, category } of itemMapping) {
        const itemId = geminiResult[key];
        if (itemId && itemId.trim()) {
          const clothesItem = validClothes.find(c => c.id === itemId);
          if (clothesItem) {
            items.push({
              item_id: itemId,
              category: clothesItem.category,
              item_name: clothesItem.category,
              color: clothesItem.analysis.color,
              style: clothesItem.analysis.style
            });
          }
        }
      }

      // Add accessories
      if (geminiResult.accessories && Array.isArray(geminiResult.accessories)) {
        for (const accessoryId of geminiResult.accessories) {
          if (accessoryId && accessoryId.trim()) {
            const clothesItem = validClothes.find(c => c.id === accessoryId);
            if (clothesItem) {
              items.push({
                item_id: accessoryId,
                category: clothesItem.category,
                item_name: clothesItem.category,
                color: clothesItem.analysis.color,
                style: clothesItem.analysis.style
              });
            }
          }
        }
      }

      return {
        outfit: {
          title: 'AI Generated Outfit',
          items,
          description: geminiResult.description || 'Stylish outfit',
          color_harmony: geminiResult.colorHarmony || 'Harmonious colors',
          styling_tips: geminiResult.stylingTips || [],
          perfect_for: styleContext,
        },
        reasoning: geminiResult.description || 'AI-generated outfit based on your wardrobe',
        score: 0.85,
        score_breakdown: {
          style_match: 0.85,
          weather_appropriateness: finalWeatherData ? 0.9 : 0.8,
          color_harmony: 0.85,
          requirements_fulfillment: 0.85
        }
      };
    };

    // Generate outfit with Gemini
    logger.info('Generating outfit with Google Gemini 1.5 Flash...');
    
    let geminiResult, bestOutfit;
    const classification = { 
      occasion: styleContext, 
      style: styleContext,
      formality: styleContext === 'formal' ? 'formal' : 'casual'
    };
    const requirements = { style_context: styleContext };
    
    try {
      geminiResult = await generateOutfitWithGemini();
      logger.info('Gemini result:', geminiResult);

      bestOutfit = processOutfitResult(geminiResult);
      
      logger.info('Outfit processed:', { 
        itemCount: bestOutfit.outfit.items.length,
        description: bestOutfit.outfit.description.substring(0, 50)
      });

      // Validate outfit structure
      if (!bestOutfit.outfit?.items || !Array.isArray(bestOutfit.outfit.items)) {
        throw new Error('Outfit has invalid structure');
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

      // CRITICAL VALIDATION: Verify all item_id values exist in user's wardrobe
      logger.info('Validating outfit items against user wardrobe...');
      const validItemIds = new Set(validClothes.map(item => item.id));
      const invalidItems: any[] = [];
      const validatedItems: any[] = [];
      
      bestOutfit.outfit.items.forEach((item: any) => {
        if (!item.item_id || !validItemIds.has(item.item_id)) {
          logger.warn('AI returned invalid item_id', { item_id: item.item_id, category: item.category });
          invalidItems.push(item);
        } else {
          validatedItems.push(item);
        }
      });

      // If AI returned invalid items, log and remove them
      if (invalidItems.length > 0) {
        logger.error('AI generated outfit with non-existent items', { 
          invalidCount: invalidItems.length,
          invalidItems: invalidItems.map(i => ({ id: i.item_id, category: i.category }))
        });
        
        // Replace items list with only valid ones
        bestOutfit.outfit.items = validatedItems;
      }

      // Check if we have enough items after validation
      if (validatedItems.length === 0) {
        return errorResponse(
          500,
          'AI generated outfit with no valid items from your wardrobe. Please try again.',
          'NO_VALID_ITEMS',
          undefined,
          corsHeaders
        );
      }

      // 🚨 CRITICAL: Validate outfit logic
      const itemCategories = validatedItems.map((item: any) => {
        const clothesItem = validClothes.find(c => c.id === item.item_id);
        return clothesItem?.analysis?.main_category || 'other';
      });

      const hasDress = itemCategories.includes('dress');
      const hasTop = itemCategories.includes('top');
      const hasBottom = itemCategories.includes('bottom');
      const hasFootwear = itemCategories.includes('footwear');

      // Rule: NEVER dress + top/bottom
      if (hasDress && (hasTop || hasBottom)) {
        logger.error('Invalid outfit: dress combined with top/bottom - removing conflicting items');
        // Keep dress, remove top/bottom
        bestOutfit.outfit.items = validatedItems.filter((item: any) => {
          const clothesItem = validClothes.find(c => c.id === item.item_id);
          const mainCat = clothesItem?.analysis?.main_category;
          return mainCat !== 'top' && mainCat !== 'bottom';
        });
      }

      // Rule: ALWAYS include footwear if available
      const availableFootwear = clothesByCategory.footwear || [];
      if (!hasFootwear && availableFootwear.length > 0) {
        logger.warn('Outfit missing footwear - adding automatically');
        
        // Choose footwear that matches the outfit style
        const outfitFormality = classification?.formality || 'casual';
        const outfitStyle = classification?.style || 'casual';
        
        // Sort footwear by style match
        const sortedFootwear = availableFootwear.sort((a, b) => {
          const aFormality = a.analysis?.formality || 'casual';
          const bFormality = b.analysis?.formality || 'casual';
          const aStyle = a.analysis?.style || 'casual';
          const bStyle = b.analysis?.style || 'casual';
          
          // Prioritize formality match
          const aFormalityMatch = aFormality === outfitFormality ? 2 : (Math.abs(
            ['casual', 'semi-formal', 'formal'].indexOf(aFormality) - 
            ['casual', 'semi-formal', 'formal'].indexOf(outfitFormality)
          ) === 1 ? 1 : 0);
          
          const bFormalityMatch = bFormality === outfitFormality ? 2 : (Math.abs(
            ['casual', 'semi-formal', 'formal'].indexOf(bFormality) - 
            ['casual', 'semi-formal', 'formal'].indexOf(outfitFormality)
          ) === 1 ? 1 : 0);
          
          // Then style match
          const aStyleMatch = aStyle === outfitStyle ? 1 : 0;
          const bStyleMatch = bStyle === outfitStyle ? 1 : 0;
          
          return (bFormalityMatch + bStyleMatch) - (aFormalityMatch + aStyleMatch);
        });
        
        const suitableShoe = sortedFootwear[0];
        if (suitableShoe) {
          bestOutfit.outfit.items.push({
            item_id: suitableShoe.id,
            category: suitableShoe.category,
            item_name: suitableShoe.category,
            color: suitableShoe.analysis.color,
            style: suitableShoe.analysis.style
          });
          logger.info('Added footwear to complete outfit', { 
            footwear_id: suitableShoe.id,
            footwear_style: suitableShoe.analysis.style,
            outfit_style: outfitStyle
          });
        }
      }

      // Rule: Non-dress outfits need top AND bottom
      if (!hasDress && (!hasTop || !hasBottom)) {
        logger.error('Invalid outfit: missing top or bottom for non-dress outfit');
        return errorResponse(
          500,
          'Could not create a complete outfit. Please ensure you have both tops and bottoms in your wardrobe, or add a dress.',
          'INCOMPLETE_OUTFIT',
          undefined,
          corsHeaders
        );
      }

      // Check for missing categories if AI flagged them
      if (bestOutfit.outfit.missing_categories && bestOutfit.outfit.missing_categories.length > 0) {
        logger.info('AI identified missing categories', { missing: bestOutfit.outfit.missing_categories });
        // Include this info in the response but don't fail
      }

      logger.info('Validation complete', { 
        totalItems: bestOutfit.outfit.items.length,
        invalidItemsRemoved: invalidItems.length,
        hasDress,
        hasTop,
        hasBottom,
        hasFootwear,
        missingCategories: bestOutfit.outfit.missing_categories || []
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Pipeline error', err);
      
      if (msg === 'AI_RATE_LIMIT') {
        return errorResponse(429, 'Google Gemini rate limit exceeded. Please try again later.', 'AI_RATE_LIMIT', undefined, corsHeaders);
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

    // Generate image prompt for Unsplash
    const imagePrompt = geminiResult.imagePrompt || 
      `${mood || 'stylish'} ${styleContext} outfit ${selectedItems.map(i => i.analysis.color).join(' ')}`;
    
    let generatedImageUrl = imagePrompt; // Store the prompt, frontend can use Unsplash API

    // Save outfit to database
    const { data: savedOutfit, error: saveError } = await supabase
      .from('outfits')
      .insert({
        user_id: userId,
        title: bestOutfit.outfit.title,
        prompt,
        mood,
        is_public: isPublic,
        generated_image_url: imagePrompt,
        description: bestOutfit.outfit.description,
        recommended_clothes: legacyRecommendedItems,
        purchase_links: purchaseLinks || [],
        ai_analysis: {
          styling_tips: bestOutfit.outfit.styling_tips,
          occasion: bestOutfit.outfit.perfect_for || styleContext,
          color_harmony: bestOutfit.outfit.color_harmony,
          clothes_analysis: validClothes,
          outfit_visualization: outfitVisualization,
          structured_items: bestOutfit.outfit.items,
          style_context: styleContext,
          reasoning: bestOutfit.reasoning,
          score: bestOutfit.score,
          gemini_model: 'gemini-1.5-flash-latest'
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
      imagePrompt: imagePrompt
    };
    const responseMeta = {
      processingTimeMs: Date.now() - startTime,
      clothesAnalyzed: clothes.length,
      aiModel: 'Google Gemini 1.5 Flash',
      fromCache: false,
      cached: !selectedItem,
    };

    return successResponse(responsePayload, responseMeta, corsHeaders);


});