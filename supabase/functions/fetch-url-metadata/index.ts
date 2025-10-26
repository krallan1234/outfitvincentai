import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// Simple rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute

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

function extractMetadataFromHtml(html: string, baseUrl: URL) {
  const get = (re: RegExp) => {
    const m = html.match(re);
    return m ? m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'") : '';
  };

  const metadata: any = {
    title: '',
    description: '',
    image: '',
    price: '',
    brand: '',
    color: '',
    category: ''
  };

  metadata.image =
    get(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
    get(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) ||
    get(/<meta[^>]*itemprop=["']image["'][^>]*content=["']([^"']+)["']/i) ||
    '';

  metadata.title =
    get(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
    get(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i) ||
    get(/<title[^>]*>([^<]+)<\/title>/i) || '';

  metadata.description =
    get(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
    get(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) || '';

  if (metadata.image && !metadata.image.startsWith('http')) {
    metadata.image = new URL(metadata.image, baseUrl.origin).href;
  }

  const pricePatterns = [
    /"price":\s*"?(\d+[.,]?\d*)"?/i,
    /[\$€£]\s*(\d+[.,]?\d*)/,
    /(\d+[.,]?\d*)\s*[\$€£]/,
    /<meta[^>]*property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i
  ];
  for (const p of pricePatterns) {
    const m = html.match(p);
    if (m && m[1]) { metadata.price = m[1]; break; }
  }

  metadata.brand =
    get(/<meta[^>]*property=["']og:brand["'][^>]*content=["']([^"']+)["']/i) ||
    get(/<meta[^>]*property=["']product:brand["'][^>]*content=["']([^"']+)["']/i) ||
    get(/"brand":\s*\{\s*"name":\s*"([^"]+)"/i) ||
    get(/"brand":\s*"([^"]+)"/i) || '';

  const text = (metadata.title + ' ' + metadata.description).toLowerCase();
  const categories: Record<string, string[]> = {
    tops: ['shirt','t-shirt','tee','blouse','top','sweater','hoodie','sweatshirt','tröja','topp'],
    bottoms: ['pants','jeans','trousers','shorts','skirt','byxor','kjol'],
    dresses: ['dress','gown','klänning'],
    outerwear: ['jacket','coat','blazer','cardigan','jacka','kappa'],
    shoes: ['shoes','sneakers','boots','sandals','heels','skor','stövlar'],
    accessories: ['bag','hat','scarf','belt','watch','jewelry','necklace','bracelet','ring','väska','halsband','armband']
  };
  for (const [cat, kws] of Object.entries(categories)) {
    if (kws.some(k => text.includes(k))) { metadata.category = cat; break; }
  }

  const colors = ['black','white','red','blue','green','yellow','pink','purple','brown','gray','grey','beige','navy','orange',
                  'svart','vit','röd','blå','grön','gul','rosa','lila','brun','grå','beige'];
  for (const c of colors) { if (text.includes(c)) { metadata.color = c; break; } }

  return metadata;
}

async function fallbackLinkPreview(url: string) {
  const key = Deno.env.get('LINK_PREVIEW_API_KEY');
  if (!key) return { ok: false as const, error: 'Missing LINK_PREVIEW_API_KEY secret' };
  try {
    const r = await fetch(`https://api.linkpreview.net/?key=${key}&q=${encodeURIComponent(url)}`);
    if (!r.ok) return { ok: false as const, error: `LinkPreview error ${r.status}` };
    const j = await r.json(); // { title, description, image, url }
    const base = new URL(j.url || url);
    const meta = {
      title: j.title || '',
      description: j.description || '',
      image: j.image || '',
      price: '',
      brand: base.hostname.split('.')[0] || '',
      color: '',
      category: ''
    };
    const enriched = extractMetadataFromHtml(`<title>${meta.title}</title><meta name="description" content="${meta.description}">`, base);
    return { ok: true as const, data: { ...meta, color: enriched.color, category: enriched.category } };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'LinkPreview failed' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const authHeader = req.headers.get('authorization');
  const identifier = authHeader || req.headers.get('x-forwarded-for') || 'anonymous';
  
  if (!checkRateLimit(identifier)) {
    return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: 'URL is required' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    console.log('Fetching metadata for URL:', url);

    let parsedUrl: URL;
    try { parsedUrl = new URL(url); } catch {
      return new Response(JSON.stringify({ success: false, error: 'Invalid URL format' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // Primary attempt: direct fetch (may fail with 403 on some retailers)
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'DNT': '1',
          'Upgrade-Insecure-Requests': '1'
        },
        redirect: 'follow'
      });

      if (response.ok) {
        const html = await response.text();
        const metadata = extractMetadataFromHtml(html, parsedUrl);
        if (!metadata.image) {
          // Try LinkPreview if direct fetch lacks image
          const fb = await fallbackLinkPreview(url);
          if (fb.ok && fb.data.image) {
            return new Response(JSON.stringify({ success: true, data: fb.data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
          }
        }
        return new Response(JSON.stringify({ success: true, data: { ...metadata, url } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      } else {
        console.error('Direct fetch not OK:', response.status, response.statusText);
        const fb = await fallbackLinkPreview(url);
        if (fb.ok) {
          return new Response(JSON.stringify({ success: true, data: fb.data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }
        return new Response(JSON.stringify({ success: false, error: `Website returned ${response.status}`, suggestion: 'Try a direct product page URL' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }
    } catch (err) {
      console.error('Direct fetch error:', err);
      const fb = await fallbackLinkPreview(url);
      if (fb.ok) {
        return new Response(JSON.stringify({ success: true, data: fb.data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }
      return new Response(JSON.stringify({ success: false, error: 'Unable to access this URL', suggestion: 'Retailer may block bots – try another link' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to fetch metadata' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  }
});