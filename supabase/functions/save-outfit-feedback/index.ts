import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, outfitId, feedbackType, confidenceScore, styleContext } = await req.json();
    
    // Validate input
    if (!userId || !outfitId || !['like', 'dislike'].includes(feedbackType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid input parameters' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert feedback (insert or update if exists)
    const { data, error } = await supabase
      .from('outfit_feedback')
      .upsert({
        user_id: userId,
        outfit_id: outfitId,
        feedback_type: feedbackType,
        confidence_score: confidenceScore || null,
        style_context: styleContext || null
      }, {
        onConflict: 'user_id,outfit_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Feedback saved successfully:', data);

    return new Response(
      JSON.stringify({ success: true, feedback: data }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in save-outfit-feedback:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to save feedback' 
      }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
