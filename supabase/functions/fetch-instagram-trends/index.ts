import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface InstagramPost {
  id: string;
  caption: string;
  media_url: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query = '' } = await req.json();
    const accessToken = Deno.env.get('META_ACCESS_TOKEN');

    if (!accessToken) {
      throw new Error('META_ACCESS_TOKEN not configured');
    }

    console.log('Fetching Instagram trends for:', query);

    // Search for fashion hashtags on Instagram
    const hashtags = ['fashion', 'ootd', 'streetwear', 'style', 'outfit'];
    const trendingHashtags = new Set<string>();
    const keywords = new Set<string>();
    const styles = new Set<string>();

    // Extract hashtags from Instagram Business Discovery API
    // Note: This requires an Instagram Business Account
    const response = await fetch(
      `https://graph.instagram.com/v18.0/me/media?fields=id,caption,media_url,permalink,timestamp,like_count&access_token=${accessToken}&limit=50`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.warn('Instagram API error:', response.status, await response.text());
      // Return empty data instead of failing
      return new Response(
        JSON.stringify({
          success: false,
          query,
          trending_hashtags: [],
          trending_keywords: [],
          trending_styles: [],
          ai_context: 'Instagram data unavailable',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    const posts: InstagramPost[] = data?.data || [];

    console.log(`Found ${posts.length} Instagram posts`);

    // Extract hashtags and keywords from captions
    posts.forEach(post => {
      if (!post.caption) return;

      const caption = post.caption.toLowerCase();
      
      // Extract hashtags
      const hashtagMatches = caption.match(/#(\w+)/g);
      if (hashtagMatches) {
        hashtagMatches.forEach(tag => {
          const cleanTag = tag.replace('#', '');
          if (cleanTag.length > 3) {
            trendingHashtags.add(cleanTag);
          }
        });
      }

      // Extract style keywords
      if (caption.includes('street')) styles.add('streetwear');
      if (caption.includes('casual')) styles.add('casual');
      if (caption.includes('formal')) styles.add('formal');
      if (caption.includes('vintage')) styles.add('vintage');
      if (caption.includes('minimal')) styles.add('minimalist');
      if (caption.includes('bohemian') || caption.includes('boho')) styles.add('bohemian');
      if (caption.includes('athletic') || caption.includes('sporty')) styles.add('athletic');

      // Extract general keywords
      const words = caption.split(/\s+/);
      words.forEach(word => {
        const clean = word.replace(/[^a-z]/g, '');
        if (clean.length > 4 && !hashtags.includes(clean)) {
          keywords.add(clean);
        }
      });
    });

    const hashtagArray = Array.from(trendingHashtags).slice(0, 20);
    const keywordArray = Array.from(keywords).slice(0, 15);
    const styleArray = Array.from(styles);

    const ai_context = hashtagArray.length > 0
      ? `Instagram Fashion Trends: Popular hashtags include #${hashtagArray.slice(0, 10).join(', #')}. ` +
        `Trending styles: ${styleArray.join(', ')}. ` +
        `Community engagement focuses on ${keywordArray.slice(0, 5).join(', ')}.`
      : 'Instagram trend data limited.';

    console.log('Instagram AI context generated:', ai_context);

    return new Response(
      JSON.stringify({
        success: true,
        query,
        trending_hashtags: hashtagArray,
        trending_keywords: keywordArray,
        trending_styles: styleArray,
        ai_context,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching Instagram trends:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        ai_context: '',
        trending_hashtags: [],
        trending_keywords: [],
        trending_styles: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
