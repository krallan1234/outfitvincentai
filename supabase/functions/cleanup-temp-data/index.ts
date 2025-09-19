import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

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
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete expired temporary Instagram data (older than 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: expiredData, error: selectError } = await supabase
      .from('outfits')
      .select('id')
      .like('id', 'temp_instagram_%')
      .lt('created_at', twentyFourHoursAgo);

    if (selectError) {
      console.error('Error finding expired data:', selectError);
      throw selectError;
    }

    if (expiredData && expiredData.length > 0) {
      const { error: deleteError } = await supabase
        .from('outfits')
        .delete()
        .in('id', expiredData.map(item => item.id));

      if (deleteError) {
        console.error('Error deleting expired data:', deleteError);
        throw deleteError;
      }

      console.log(`Cleaned up ${expiredData.length} expired Instagram temp records`);
    }

    // Also clean up any records that have expires_at in ai_analysis
    const { data: expiredAnalysis, error: analysisError } = await supabase
      .from('outfits')
      .select('id, ai_analysis')
      .not('ai_analysis->expires_at', 'is', null);

    if (!analysisError && expiredAnalysis) {
      const expiredIds = expiredAnalysis
        .filter(item => {
          try {
            const expiresAt = item.ai_analysis?.expires_at;
            return expiresAt && new Date(expiresAt) < new Date();
          } catch {
            return false;
          }
        })
        .map(item => item.id);

      if (expiredIds.length > 0) {
        const { error: deleteAnalysisError } = await supabase
          .from('outfits')
          .delete()
          .in('id', expiredIds);

        if (!deleteAnalysisError) {
          console.log(`Cleaned up ${expiredIds.length} expired analysis records`);
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Cleanup completed successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in cleanup-temp-data function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});