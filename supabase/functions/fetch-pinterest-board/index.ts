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

    if (!userId || !accessToken) {
      throw new Error('User ID and access token are required');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user's boards if no boardId specified
    if (!boardId) {
      console.log('Fetching user boards...');
      const boardsResponse = await fetch('https://api.pinterest.com/v5/boards', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!boardsResponse.ok) {
        const error = await boardsResponse.text();
        console.error('Failed to fetch boards:', error);
        throw new Error('Failed to fetch Pinterest boards');
      }

      const boardsData = await boardsResponse.json();
      console.log(`Found ${boardsData.items?.length || 0} boards`);

      return new Response(
        JSON.stringify({ boards: boardsData.items || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch pins from specific board
    console.log(`Fetching pins from board ${boardId}...`);
    const pinsResponse = await fetch(`https://api.pinterest.com/v5/boards/${boardId}/pins?page_size=25`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!pinsResponse.ok) {
      const error = await pinsResponse.text();
      console.error('Failed to fetch pins:', error);
      throw new Error('Failed to fetch board pins');
    }

    const pinsData = await pinsResponse.json();
    const pins = pinsData.items || [];
    console.log(`Fetched ${pins.length} pins from board`);

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
    const boardResponse = await fetch(`https://api.pinterest.com/v5/boards/${boardId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    let boardName = 'My Board';
    let boardUrl = '';
    
    if (boardResponse.ok) {
      const boardData = await boardResponse.json();
      boardName = boardData.name || boardName;
      boardUrl = boardData.url || '';
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
    console.error('Fetch board error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to fetch board' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
