import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PinterestPin {
  id: string;
  title: string;
  description: string;
  image_url: string;
  link: string;
  save_count?: number;
  dominant_color?: string;
}

// In-memory cache with 6h TTL
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

const getCachedData = (key: string) => {
  const cached = cache.get(key);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log(`[fetch-pinterest-trends] Using cached data for "${key}"`);
    return cached.data;
  }
  return null;
};

const setCachedData = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
  console.log(`[fetch-pinterest-trends] Cached data for "${key}"`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 20 } = await req.json();
    
    if (!query) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Query parameter is required',
        pins: [],
        ai_context: '',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check cache first
    const cacheKey = `${query}_${limit}`;
    const cachedResult = getCachedData(cacheKey);
    if (cachedResult) {
      return new Response(JSON.stringify({ success: true, ...cachedResult }), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
        },
      });
    }

    const clientId = Deno.env.get('PINTEREST_CLIENT_ID');
    const clientSecret = Deno.env.get('PINTEREST_CLIENT_SECRET');
    
    console.log('[fetch-pinterest-trends] Environment check:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      clientIdLength: clientId?.length || 0,
    });
    
    if (!clientId || !clientSecret) {
      console.error('[fetch-pinterest-trends] Missing Pinterest credentials');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Pinterest API credentials not configured. Please contact administrator.',
        pins: [],
        ai_context: '',
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Requesting Pinterest access token with client credentials flow...');

    // Get access token using client credentials flow
    const tokenResponse = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'boards:read pins:read',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[fetch-pinterest-trends] Pinterest token error:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText,
      });
      return new Response(JSON.stringify({ 
        success: false,
        error: `Failed to authenticate with Pinterest API (${tokenResponse.status}). Please check API credentials.`,
        pins: [],
        ai_context: '',
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('Access token received successfully');
    const { access_token } = tokenData;

    // Search for pins
    const searchUrl = new URL('https://api.pinterest.com/v5/search/pins');
    searchUrl.searchParams.set('query', query);
    searchUrl.searchParams.set('page_size', limit.toString());

    const searchResponse = await fetch(searchUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('[fetch-pinterest-trends] Pinterest search error:', {
        status: searchResponse.status,
        statusText: searchResponse.statusText,
        error: errorText,
        query,
      });
      return new Response(JSON.stringify({ 
        success: false,
        error: `Pinterest search failed (${searchResponse.status}). The API might be rate-limited or unavailable.`,
        pins: [],
        ai_context: '',
      }), {
        status: searchResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const searchData = await searchResponse.json();
    
    // Transform and filter pins
    const pins: PinterestPin[] = (searchData.items || [])
      .filter((pin: any) => pin.media?.images?.['600x'] || pin.media?.images?.original)
      .map((pin: any) => ({
        id: pin.id,
        title: pin.title || '',
        description: pin.description || '',
        image_url: pin.media?.images?.['600x']?.url || pin.media?.images?.original?.url || '',
        link: pin.link || `https://pinterest.com/pin/${pin.id}`,
        save_count: pin.save_count || 0,
        dominant_color: pin.dominant_color || '#000000',
      }))
      .sort((a: PinterestPin, b: PinterestPin) => (b.save_count || 0) - (a.save_count || 0))
      .slice(0, limit);

    // Generate summary for AI
    const colors = [...new Set(pins.map(p => p.dominant_color).filter(Boolean))].slice(0, 5);
    const keywords = [...new Set(
      pins.flatMap(p => 
        [p.title, p.description]
          .join(' ')
          .toLowerCase()
          .split(/\s+/)
          .filter(w => w.length > 3)
      )
    )].slice(0, 20);

    const summary = {
      query,
      total_pins: pins.length,
      dominant_colors: colors,
      trending_keywords: keywords,
      top_pins: pins.slice(0, 8),
      ai_context: `Based on ${pins.length} trending Pinterest pins for "${query}", popular colors include ${colors.join(', ')}. Trending themes: ${keywords.slice(0, 10).join(', ')}.`,
    };

    console.log(`Found ${pins.length} trending pins for "${query}"`);

    // Cache the result
    setCachedData(cacheKey, summary);

    return new Response(JSON.stringify({ success: true, ...summary }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('[fetch-pinterest-trends] Unhandled error:', error);
    console.error('[fetch-pinterest-trends] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown server error',
        pins: [],
        ai_context: '',
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
