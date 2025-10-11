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
    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch URL');
    }

    const html = await response.text();

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

    // Extract Open Graph and meta tags
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);

    metadata.title = ogTitleMatch?.[1] || titleMatch?.[1] || '';
    metadata.description = ogDescMatch?.[1] || descMatch?.[1] || '';
    metadata.image = ogImageMatch?.[1] || '';

    // Make image URL absolute if it's relative
    if (metadata.image && !metadata.image.startsWith('http')) {
      const baseUrl = new URL(url);
      metadata.image = new URL(metadata.image, baseUrl.origin).href;
    }

    // Try to extract price
    const priceMatches = html.match(/[\$€£][\d,]+\.?\d*/g) || 
                        html.match(/[\d,]+\.?\d*\s*[\$€£]/g) ||
                        html.match(/"price":\s*"?(\d+\.?\d*)"?/i);
    if (priceMatches && priceMatches.length > 0) {
      metadata.price = priceMatches[0];
    }

    // Try to extract brand from common patterns
    const brandMatch = html.match(/<meta[^>]*property=["']og:brand["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/"brand":\s*"([^"]+)"/i);
    if (brandMatch) {
      metadata.brand = brandMatch[1];
    }

    // Auto-detect category based on title and description
    const text = (metadata.title + ' ' + metadata.description).toLowerCase();
    const categories = {
      'tops': ['shirt', 't-shirt', 'tee', 'blouse', 'top', 'sweater', 'hoodie', 'sweatshirt'],
      'bottoms': ['pants', 'jeans', 'trousers', 'shorts', 'skirt'],
      'dresses': ['dress', 'gown'],
      'outerwear': ['jacket', 'coat', 'blazer', 'cardigan'],
      'shoes': ['shoes', 'sneakers', 'boots', 'sandals', 'heels'],
      'accessories': ['bag', 'hat', 'scarf', 'belt', 'watch', 'jewelry', 'necklace', 'bracelet', 'ring']
    };

    let detectedCategory = '';
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        detectedCategory = category;
        break;
      }
    }
    metadata.category = detectedCategory;

    // Try to detect color
    const colors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'brown', 'gray', 'grey', 'beige', 'navy', 'orange'];
    for (const color of colors) {
      if (text.includes(color)) {
        metadata.color = color;
        break;
      }
    }

    console.log('Extracted metadata:', metadata);

    return new Response(
      JSON.stringify(metadata),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error fetching metadata:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch metadata' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
