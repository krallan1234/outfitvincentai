import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, accessToken, boardId } = await req.json();
    console.log('Fetch Pinterest board request:', { userId, hasBoardId: !!boardId, hasToken: !!accessToken });

    if (!userId || !accessToken) {
      console.error('Missing required parameters:', { userId: !!userId, accessToken: !!accessToken });
      throw new Error('User ID and access token are required');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user's boards if no boardId specified
    if (!boardId) {
      console.log('Fetching user boards from Pinterest API...');
      // Use the correct endpoint for fetching user boards
      const boardsUrl = 'https://api.pinterest.com/v5/boards';
      console.log('API URL:', boardsUrl);
      
      const boardsResponse = await fetch(boardsUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Boards API response status:', boardsResponse.status);

      if (!boardsResponse.ok) {
        const errorText = await boardsResponse.text();
        console.error('Failed to fetch boards:', {
          status: boardsResponse.status,
          statusText: boardsResponse.statusText,
          error: errorText
        });
        
        // Handle specific error codes
        if (boardsResponse.status === 401) {
          return new Response(
            JSON.stringify({ 
              error: 'Authentication failed',
              requiresReauth: true,
              details: {
                status: 401,
                hint: 'Your Pinterest session has expired. Please reconnect your account.'
              }
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (boardsResponse.status === 403) {
          return new Response(
            JSON.stringify({ 
              error: 'Permission denied',
              requiresReauth: true,
              details: {
                status: 403,
                hint: 'Missing required permissions (boards:read, user_accounts:read). Please reconnect with all permissions.'
              }
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (boardsResponse.status === 429) {
          return new Response(
            JSON.stringify({ 
              error: 'Rate limit exceeded',
              rateLimited: true,
              details: {
                status: 429,
                hint: 'Too many requests to Pinterest. Please wait 60 seconds before trying again.',
                retryAfter: 60
              }
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            error: 'Failed to fetch boards from Pinterest',
            details: {
              status: boardsResponse.status,
              message: boardsResponse.statusText,
              errorResponse: errorText
            }
          }),
          { status: boardsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const boardsData = await boardsResponse.json();
      console.log('Boards fetched successfully:', {
        count: boardsData.items?.length || 0,
        hasItems: !!boardsData.items
      });

      // If no boards found, return empty array (frontend will handle fallback)
      if (!boardsData.items || boardsData.items.length === 0) {
        console.log('No boards found for user');
        return new Response(
          JSON.stringify({ boards: [], noBoardsFound: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ boards: boardsData.items || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
          }),
          { status: boardsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const boardsData = await boardsResponse.json();
      console.log('Boards fetched successfully:', {
        count: boardsData.items?.length || 0,
        hasItems: !!boardsData.items
      });

      return new Response(
        JSON.stringify({ boards: boardsData.items || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch pins from specific board
    console.log('Fetching pins for board:', boardId);
    const pinsUrl = `https://api.pinterest.com/v5/boards/${boardId}/pins?page_size=25`;
    console.log('Pins API URL:', pinsUrl);
    
    const pinsResponse = await fetch(pinsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Pins API response status:', pinsResponse.status);

    if (!pinsResponse.ok) {
      const errorText = await pinsResponse.text();
      console.error('Failed to fetch pins:', {
        status: pinsResponse.status,
        statusText: pinsResponse.statusText,
        error: errorText
      });
      throw new Error(`Failed to fetch board pins: ${pinsResponse.statusText}`);
    }

    const pinsData = await pinsResponse.json();
    const pins = pinsData.items || [];
    console.log('Pins fetched successfully:', { count: pins.length });

    // Extract relevant data from pins
    const pinsAnalysis = pins.map((pin: any) => ({
      id: pin.id,
      title: pin.title,
      description: pin.description,
      imageUrl: pin.media?.images?.['600x']?.url || pin.media?.images?.original?.url,
      link: pin.link,
      dominantColor: pin.dominant_color,
      board_id: pin.board_id,
    }));

    // Get board details
    console.log('Fetching board details for:', boardId);
    const boardResponse = await fetch(`https://api.pinterest.com/v5/boards/${boardId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Board details API response status:', boardResponse.status);

    let boardName = 'My Board';
    let boardUrl = '';
    
    if (boardResponse.ok) {
      const boardData = await boardResponse.json();
      boardName = boardData.name || boardName;
      boardUrl = boardData.url || '';
      console.log('Board details fetched:', { name: boardName, pinsCount: pins.length });
    } else {
      const errorText = await boardResponse.text();
      console.error('Failed to fetch board details:', {
        status: boardResponse.status,
        error: errorText
      });
    }

    // Store board data in Supabase
    const { error: upsertError } = await supabase
      .from('pinterest_boards')
      .upsert({
        user_id: userId,
        board_id: boardId,
        board_name: boardName,
        board_url: boardUrl,
        access_token: accessToken,
        pins_data: pinsAnalysis,
        last_synced_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,board_id',
      });

    if (upsertError) {
      console.error('Error storing board:', upsertError);
      throw new Error('Failed to store board data');
    }

    console.log('Board data stored successfully');

    return new Response(
      JSON.stringify({ 
        board: {
          id: boardId,
          name: boardName,
          url: boardUrl,
          pinsCount: pins.length,
        },
        pins: pinsAnalysis,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching Pinterest board:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to fetch board',
        details: {
          type: error instanceof Error ? error.constructor.name : 'Unknown',
          hint: 'Check the edge function logs for more details'
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
