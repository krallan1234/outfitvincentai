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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting cleanup of expired outfit cache entries...');

    // Delete expired cache entries
    const { data: deletedEntries, error: deleteError } = await supabase
      .from('outfit_generation_cache')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (deleteError) {
      console.error('Error deleting expired cache:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to clean cache', details: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deletedCount = deletedEntries?.length || 0;
    console.log(`Cleanup completed: ${deletedCount} expired entries removed`);

    // Also clean up old entries with low hit count (older than 7 days and never hit)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: oldUnusedEntries, error: oldError } = await supabase
      .from('outfit_generation_cache')
      .delete()
      .lt('created_at', sevenDaysAgo.toISOString())
      .eq('hit_count', 0)
      .select('id');

    if (oldError) {
      console.warn('Error cleaning old unused cache:', oldError);
    } else {
      const oldDeletedCount = oldUnusedEntries?.length || 0;
      console.log(`Removed ${oldDeletedCount} old unused entries`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        expiredEntriesDeleted: deletedCount,
        oldUnusedEntriesDeleted: oldUnusedEntries?.length || 0,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
