import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pinterest OAuth credentials
const PINTEREST_APP_ID = Deno.env.get('PINTEREST_APP_ID') || Deno.env.get('META_APP_ID');
const PINTEREST_APP_SECRET = Deno.env.get('PINTEREST_APP_SECRET') || Deno.env.get('META_APP_SECRET');
const ENCRYPTION_KEY = Deno.env.get('PINTEREST_TOKEN_ENCRYPTION_KEY')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

console.log('Pinterest Auth initialized with App ID:', PINTEREST_APP_ID ? 'Present' : 'Missing');

// Simple encryption function
function encryptToken(token: string): string {
  const hmac = createHmac("sha256", ENCRYPTION_KEY);
  hmac.update(token);
  return hmac.digest("hex") + ":" + btoa(token);
}

function decryptToken(encrypted: string): string {
  const parts = encrypted.split(":");
  if (parts.length !== 2) throw new Error("Invalid encrypted token format");
  return atob(parts[1]);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, code, redirectUri, userId } = await req.json();
    console.log('Pinterest auth request:', { action, userId, hasCode: !!code });
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'getAuthUrl') {
      // Generate Pinterest OAuth URL with all required scopes
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
      console.log('Pinterest authentication successful');
      console.log('Token data keys:', Object.keys(tokenData));

      // Validate the access token by calling /v5/user_account
      console.log('Validating access token with /v5/user_account...');
      const userAccountResponse = await fetch('https://api.pinterest.com/v5/user_account', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('User account validation status:', userAccountResponse.status);

      if (!userAccountResponse.ok) {
        const error = await userAccountResponse.text();
        console.error('Token validation failed:', {
          status: userAccountResponse.status,
          error: error
        });
        
        return new Response(
          JSON.stringify({ 
            error: 'Access token validation failed',
            details: {
              status: userAccountResponse.status,
              hint: 'Token was issued but failed validation - please try again'
            }
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userAccountData = await userAccountResponse.json();
      console.log('Token validated successfully for user:', userAccountData.username);

      // Encrypt and store the token securely in Supabase
      const encryptedAccessToken = encryptToken(tokenData.access_token);
      const encryptedRefreshToken = tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null;

      console.log('Storing encrypted tokens in database...');
      const { error: storageError } = await supabase
        .from('pinterest_boards')
        .upsert({
          user_id: userId,
          board_id: 'temp_placeholder',
          board_name: 'Temporary',
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: tokenData.expires_in 
            ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
            : null,
          last_synced_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,board_id',
          ignoreDuplicates: false
        });

      if (storageError) {
        console.error('Failed to store tokens:', storageError);
      } else {
        console.log('Tokens stored securely');
      }

      return new Response(
        JSON.stringify({ 
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresIn: tokenData.expires_in,
          tokenType: tokenData.token_type,
          scope: tokenData.scope,
          userAccount: {
            username: userAccountData.username,
            accountType: userAccountData.account_type
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'refreshToken') {
      console.log('Refreshing access token for user:', userId);

      // Get the encrypted refresh token from database
      const { data: tokenData, error: fetchError } = await supabase
        .from('pinterest_boards')
        .select('refresh_token')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (fetchError || !tokenData?.refresh_token) {
        console.error('No refresh token found:', fetchError);
        return new Response(
          JSON.stringify({ 
            error: 'No refresh token available',
            details: { hint: 'Please re-authenticate with Pinterest' }
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const refreshToken = decryptToken(tokenData.refresh_token);

      const refreshResponse = await fetch('https://api.pinterest.com/v5/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${PINTEREST_APP_ID}:${PINTEREST_APP_SECRET}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (!refreshResponse.ok) {
        const error = await refreshResponse.text();
        console.error('Token refresh failed:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Token refresh failed',
            details: { hint: 'Please re-authenticate with Pinterest' }
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const newTokenData = await refreshResponse.json();
      console.log('Token refreshed successfully');

      // Update stored tokens
      const encryptedAccessToken = encryptToken(newTokenData.access_token);
      const encryptedRefreshToken = newTokenData.refresh_token ? encryptToken(newTokenData.refresh_token) : null;

      await supabase
        .from('pinterest_boards')
        .update({
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: newTokenData.expires_in 
            ? new Date(Date.now() + newTokenData.expires_in * 1000).toISOString()
            : null,
        })
        .eq('user_id', userId);

      return new Response(
        JSON.stringify({ 
          accessToken: newTokenData.access_token,
          expiresIn: newTokenData.expires_in
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
