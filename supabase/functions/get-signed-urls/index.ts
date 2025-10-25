import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignUrlRequest {
  urls: string[];
  expiresIn?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { urls, expiresIn = 300 } = await req.json() as SignUrlRequest;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      throw new Error('urls array is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log(`[get-signed-urls] Processing ${urls.length} URLs with ${expiresIn}s expiry`);
    
    const signedUrls: Record<string, string> = {};
    const errors: Record<string, string> = {};
    
    for (const url of urls) {
      try {
        // Extract path from URL
        let path = url;
        
        if (url.includes('/object/public/clothes/')) {
          path = url.split('/object/public/clothes/')[1];
        } else if (url.includes('/storage/v1/object/sign/clothes/')) {
          path = url.split('/storage/v1/object/sign/clothes/')[1].split('?')[0];
        } else if (url.startsWith('clothes/')) {
          path = url.replace('clothes/', '');
        } else if (!url.startsWith('http')) {
          // Assume it's a path
          path = url;
        } else {
          // Couldn't extract path, use original
          signedUrls[url] = url;
          continue;
        }
        
        console.log(`[get-signed-urls] Signing path: ${path}`);
        
        const { data, error } = await supabase.storage
          .from('clothes')
          .createSignedUrl(path, expiresIn);
        
        if (error) {
          console.error(`[get-signed-urls] Failed to sign ${path}:`, error.message);
          errors[url] = error.message;
          // Try to use original URL as fallback
          signedUrls[url] = url;
        } else if (data?.signedUrl) {
          // Ensure signed URL is absolute
          const signedUrl = data.signedUrl.startsWith('http') 
            ? data.signedUrl 
            : `${supabaseUrl}/storage/v1${data.signedUrl}`;
          signedUrls[url] = signedUrl;
          console.log(`[get-signed-urls] Successfully signed ${path}`);
        } else {
          console.error(`[get-signed-urls] No signed URL returned for ${path}`);
          signedUrls[url] = url;
        }
      } catch (err) {
        console.error(`[get-signed-urls] Exception for ${url}:`, err);
        errors[url] = err instanceof Error ? err.message : 'Unknown error';
        signedUrls[url] = url; // Fallback to original
      }
    }
    
    console.log(`[get-signed-urls] Complete: ${Object.keys(signedUrls).length} URLs signed, ${Object.keys(errors).length} errors`);
    
    return new Response(
      JSON.stringify({ 
        signedUrls,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
        expiresIn,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[get-signed-urls] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        signedUrls: {},
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
