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

// Helper: obtain app access token (client credentials) with retries
async function getAppAccessToken(clientId: string, clientSecret: string, attempt = 1): Promise<string> {
  console.log(`[fetch-pinterest-trends] Requesting Pinterest access token (attempt ${attempt})...`);
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
      attempt,
    });
    if (attempt < 3) {
      // basic backoff
      await new Promise((r) => setTimeout(r, attempt * 300));
      return getAppAccessToken(clientId, clientSecret, attempt + 1);
    }
    throw new Error(`Failed to authenticate with Pinterest API (${tokenResponse.status})`);
  }

  const tokenData = await tokenResponse.json();
  console.log('[fetch-pinterest-trends] Access token received successfully');
  return tokenData.access_token as string;
}

// Helper: fallback summary generator when API fails
function generateFallbackSummary(query: string, limit: number) {
  const fallbackKeywords = [
    'minimalist', 'monochrome', 'neutrals', 'layering', 'streetwear',
    'smart casual', 'business attire', 'date night', 'summer', 'winter'
  ];
  const colors = ['#000000', '#ffffff', '#c0c0c0', '#8b4513', '#2f4f4f'];
  const pins: PinterestPin[] = Array.from({ length: Math.min(8, limit) }).map((_, i) => ({
    id: `fallback-${i + 1}`,
    title: `${query} inspiration #${i + 1}`,
    description: `Fallback trending idea for ${query}`,
    // Intentionally leave image_url blank to avoid broken external links
    image_url: '',
    link: '#',
    save_count: 0,
    dominant_color: colors[i % colors.length],
  }));

  const summary = {
    query,
    total_pins: pins.length,
    dominant_colors: colors.slice(0, 5),
    trending_keywords: fallbackKeywords.slice(0, 10),
    top_pins: pins.slice(0, 8),
    ai_context: `Fallback trends for "${query}". Popular themes: ${fallbackKeywords.slice(0, 6).join(', ')}.`,
  };
  return { pins, summary };
}

// Helper to respond consistently
function respondWith(body: any, extraHeaders: Record<string, string> = {}, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse input safely: support JSON body or URL params
    let queryParam = '';

    let limitParam = 20 as number;
    try {
      if (req.headers.get('content-type')?.includes('application/json')) {
        const payload = await req.json().catch(() => null);
        if (payload) {
          queryParam = payload.query ?? '';
          limitParam = Number(payload.limit ?? 20);
        }
      }
    } catch (_) {
      // ignore parse errors
    }

    if (!queryParam) {
      const url = new URL(req.url);
      queryParam = url.searchParams.get('query') ?? '';
      const lp = url.searchParams.get('limit');
      if (lp) limitParam = Number(lp);
    }

    if (!queryParam) {
      return respondWith({ 
        success: false,
        error: 'Query parameter is required',
        pins: [],
        ai_context: '',
      }, {}, 400);
    }

    const query = queryParam;
    const limit = isNaN(limitParam) ? 20 : Math.max(1, Math.min(50, limitParam));

    // Check cache first
    const cacheKey = `${query}_${limit}`;
    const cachedResult = getCachedData(cacheKey);
    if (cachedResult) {
      return respondWith({ success: true, ...cachedResult }, { 'X-Cache': 'HIT', 'X-Source': 'cache' });
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
      return respondWith({ 
        success: false,
        error: 'Pinterest API credentials not configured. Please contact administrator.',
        pins: [],
        ai_context: '',
      }, { 'X-Source': 'config-error' }, 401);
    }

    // Acquire access token (client credentials) with retry
    let access_token = '';
    try {
      access_token = await getAppAccessToken(clientId, clientSecret);
    } catch (e) {
      console.error('[fetch-pinterest-trends] Token acquisition failed after retries:', e);
      // If we have cached data, return it as fallback
      const cachedResult2 = getCachedData(cacheKey);
      if (cachedResult2) {
        return respondWith({ success: true, ...cachedResult2 }, { 'X-Cache': 'HIT', 'X-Source': 'cache-token-fallback' });
      }
      // Last resort: static fallback
      const { summary } = generateFallbackSummary(query, limit);
      return respondWith({ success: true, ...summary }, { 'X-Cache': 'MISS', 'X-Source': 'fallback' });
    }


    // Search for pins with retry (handles 401/5xx)
    const searchUrl = new URL('https://api.pinterest.com/v5/search/pins');
    searchUrl.searchParams.set('query', query);
    searchUrl.searchParams.set('page_size', limit.toString());

    let searchResponse: Response | null = null;
    let attempts = 0;
    while (attempts < 3) {
      attempts++;
      searchResponse = await fetch(searchUrl.toString(), {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (searchResponse.ok) break;

      const status = searchResponse.status;
      const bodyText = await searchResponse.text();
      console.error('[fetch-pinterest-trends] Pinterest search error:', {
        attempt: attempts,
        status,
        statusText: searchResponse.statusText,
        error: bodyText,
        query,
      });

      if (status === 401) {
        console.warn('[fetch-pinterest-trends] Access token likely expired. Attempting to refresh via client credentials...');
        try {
          access_token = await getAppAccessToken(clientId, clientSecret);
          // retry with new token in next loop iteration
          continue;
        } catch (e) {
          console.error('[fetch-pinterest-trends] Token refresh failed:', e);
        }
      }

      // For 5xx or other recoverable errors, wait briefly and retry
      if (status >= 500 || status === 429) {
        await new Promise((r) => setTimeout(r, attempts * 300));
        continue;
      }

      // Non-recoverable error -> break
      break;
    }

    if (!searchResponse || !searchResponse.ok) {
      // Use cache if we have it
      const cached = getCachedData(cacheKey);
      if (cached) {
        return respondWith({ success: true, ...cached }, { 'X-Cache': 'HIT', 'X-Source': 'cache-search-fallback' });
      }
      // Fallback to predefined summary
      const { summary } = generateFallbackSummary(query, limit);
      return respondWith({ success: true, ...summary }, { 'X-Cache': 'MISS', 'X-Source': 'fallback' });
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

    return respondWith({ success: true, ...summary }, { 'X-Cache': 'MISS', 'X-Source': 'pinterest' });
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
