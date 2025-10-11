import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      throw new Error('URL is required');
    }

    console.log('Fetching metadata for URL:', url);

    // Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }

    // Fetch the page with better headers to avoid blocking
    let response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        redirect: 'follow'
      });
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      throw new Error('Unable to access this URL. The website may be blocking automated access.');
    }

    if (!response.ok) {
      console.error('Response not OK:', response.status, response.statusText);
      throw new Error(`Website returned error ${response.status}. Try a different product page.`);
    }

    const html = await response.text();
    console.log('Successfully fetched HTML, length:', html.length);

    // Extract metadata using regex and meta tags
    const metadata: any = {
      url,
      title: '',
      description: '',
      image: '',
      price: '',
      brand: '',
      color: ''
    };

    // Extract Open Graph and meta tags - more comprehensive patterns
    const extractMetaContent = (pattern: RegExp) => {
      const match = html.match(pattern);
      return match ? match[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'") : '';
    };

    // Try multiple patterns for each field
    metadata.image = 
      extractMetaContent(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      extractMetaContent(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) ||
      extractMetaContent(/<meta[^>]*itemprop=["']image["'][^>]*content=["']([^"']+)["']/i) ||
      '';

    metadata.title = 
      extractMetaContent(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
      extractMetaContent(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i) ||
      extractMetaContent(/<title[^>]*>([^<]+)<\/title>/i) ||
      '';

    metadata.description = 
      extractMetaContent(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
      extractMetaContent(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
      '';

    // Make image URL absolute if it's relative
    if (metadata.image && !metadata.image.startsWith('http')) {
      metadata.image = new URL(metadata.image, parsedUrl.origin).href;
    }

    // Try to extract price - multiple patterns
    const pricePatterns = [
      /"price":\s*"?(\d+[.,]?\d*)"?/i,
      /[\$€£]\s*(\d+[.,]?\d*)/,
      /(\d+[.,]?\d*)\s*[\$€£]/,
      /<meta[^>]*property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i
    ];

    for (const pattern of pricePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        metadata.price = match[1];
        break;
      }
    }

    // Try to extract brand from common patterns
    metadata.brand = 
      extractMetaContent(/<meta[^>]*property=["']og:brand["'][^>]*content=["']([^"']+)["']/i) ||
      extractMetaContent(/<meta[^>]*property=["']product:brand["'][^>]*content=["']([^"']+)["']/i) ||
      extractMetaContent(/"brand":\s*{\s*"name":\s*"([^"]+)"/i) ||
      extractMetaContent(/"brand":\s*"([^"]+)"/i) ||
      parsedUrl.hostname.split('.')[0]; // Fallback to domain name

    // Auto-detect category based on title and description
    const text = (metadata.title + ' ' + metadata.description).toLowerCase();
    const categories: { [key: string]: string[] } = {
      'tops': ['shirt', 't-shirt', 'tee', 'blouse', 'top', 'sweater', 'hoodie', 'sweatshirt', 'tröja', 'topp'],
      'bottoms': ['pants', 'jeans', 'trousers', 'shorts', 'skirt', 'byxor', 'kjol'],
      'dresses': ['dress', 'gown', 'klänning'],
      'outerwear': ['jacket', 'coat', 'blazer', 'cardigan', 'jacka', 'kappa'],
      'shoes': ['shoes', 'sneakers', 'boots', 'sandals', 'heels', 'skor', 'stövlar'],
      'accessories': ['bag', 'hat', 'scarf', 'belt', 'watch', 'jewelry', 'necklace', 'bracelet', 'ring', 'väska', 'halsband', 'armband']
    };

    let detectedCategory = '';
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        detectedCategory = category;
        break;
      }
    }
    metadata.category = detectedCategory || 'tops'; // Default to tops if nothing detected

    // Try to detect color
    const colors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'brown', 'gray', 'grey', 'beige', 'navy', 'orange', 
                    'svart', 'vit', 'röd', 'blå', 'grön', 'gul', 'rosa', 'lila', 'brun', 'grå', 'beige'];
    for (const color of colors) {
      if (text.includes(color)) {
        metadata.color = color;
        break;
      }
    }

    console.log('Extracted metadata:', JSON.stringify(metadata, null, 2));

    // Validate that we got at least an image
    if (!metadata.image) {
      console.warn('No image found in metadata');
      throw new Error('No product image found. Please try a different product page.');
    }

    return new Response(
      JSON.stringify(metadata),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error fetching metadata:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch metadata';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        suggestion: 'Try a direct product page URL (not a search or category page)'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
