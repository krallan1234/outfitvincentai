import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pinterest OAuth credentials - Using dedicated Pinterest app credentials
const PINTEREST_APP_ID = Deno.env.get('PINTEREST_APP_ID') || Deno.env.get('META_APP_ID');
const PINTEREST_APP_SECRET = Deno.env.get('PINTEREST_APP_SECRET') || Deno.env.get('META_APP_SECRET');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

console.log('Pinterest Auth initialized with App ID:', PINTEREST_APP_ID ? 'Present' : 'Missing');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, code, redirectUri, userId } = await req.json();
    console.log('Pinterest auth request:', { action, userId, hasCode: !!code });
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'getAuthUrl') {
      // Generate Pinterest OAuth URL with proper scopes
      const scope = 'boards:read,pins:read,user_accounts:read';
      const authUrl = `https://www.pinterest.com/oauth/?` +
        `client_id=${PINTEREST_APP_ID}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${scope}&` +
        `state=${userId}`;

      console.log('Generated auth URL with scopes:', scope);
      console.log('Redirect URI:', redirectUri);

      return new Response(
        JSON.stringify({ authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'exchangeCode') {
      console.log('Exchanging code for access token...');
      console.log('Using redirect URI:', redirectUri);
      
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

      console.log('Token exchange response status:', tokenResponse.status);

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Pinterest token exchange failed:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          error: error
        });
        
        return new Response(
          JSON.stringify({ 
            error: 'Failed to authenticate with Pinterest',
            details: {
              status: tokenResponse.status,
              message: tokenResponse.statusText,
              hint: tokenResponse.status === 401 ? 'Invalid app credentials' : 
                    tokenResponse.status === 400 ? 'Invalid authorization code or redirect URI mismatch' :
                    'Pinterest API error'
            }
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokenData = await tokenResponse.json();
      console.log('Pinterest authentication successful, token received');
      console.log('Token data keys:', Object.keys(tokenData));

      return new Response(
        JSON.stringify({ 
          accessToken: tokenData.access_token,
          tokenType: tokenData.token_type,
          scope: tokenData.scope 
        }),
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
