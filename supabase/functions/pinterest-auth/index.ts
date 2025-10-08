import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PINTEREST_APP_ID = Deno.env.get('META_APP_ID'); // Using Meta credentials for Pinterest OAuth
const PINTEREST_APP_SECRET = Deno.env.get('META_APP_SECRET');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, code, redirectUri, userId } = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'getAuthUrl') {
      // Generate Pinterest OAuth URL
      const scope = 'boards:read,pins:read';
      const authUrl = `https://www.pinterest.com/oauth/?` +
        `client_id=${PINTEREST_APP_ID}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${scope}&` +
        `state=${userId}`;

      return new Response(
        JSON.stringify({ authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'exchangeCode') {
      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://api.pinterest.com/v5/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${PINTEREST_APP_ID}:${PINTEREST_APP_SECRET}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Pinterest token exchange failed:', error);
        throw new Error('Failed to authenticate with Pinterest');
      }

      const tokenData = await tokenResponse.json();
      console.log('Pinterest authentication successful');

      return new Response(
        JSON.stringify({ accessToken: tokenData.access_token }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Pinterest auth error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Authentication failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
