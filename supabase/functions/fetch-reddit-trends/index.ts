import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface RedditPost {
  data: {
    title: string;
    url: string;
    thumbnail?: string;
    score: number;
    subreddit: string;
    permalink: string;
    created_utc: number;
  };
}

interface RedditTrend {
  id: string;
  title: string;
  description: string;
  image_url: string;
  link: string;
  score: number;
  subreddit: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Support both GET and POST methods
    let query = '';
    let limit = 15;

    if (req.method === 'POST') {
      const body = await req.json();
      query = body.query || '';
      limit = body.limit || 15;
    } else if (req.method === 'GET') {
      const url = new URL(req.url);
      query = url.searchParams.get('query') || '';
      limit = parseInt(url.searchParams.get('limit') || '15');
    }

    console.log('Fetching Reddit fashion trends:', { query, limit });

    // Fetch top posts from fashion subreddits
    const response = await fetch(
      `https://www.reddit.com/r/streetwear+malefashionadvice+femalefashionadvice/top.json?t=week&limit=${limit}`,
      {
        headers: {
          'User-Agent': 'LovableApp/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }

    const data = await response.json();
    const posts: RedditPost[] = data?.data?.children || [];

    console.log(`Found ${posts.length} Reddit posts`);

    // Extract fashion keywords from titles
    const fashionKeywords = new Set<string>();
    const trendingStyles = new Set<string>();

    // Filter and transform posts into trends
    const trends: RedditTrend[] = posts
      .filter((post) => {
        const title = post.data.title.toLowerCase();
        // Filter out non-fashion posts
        return (
          title.includes('outfit') ||
          title.includes('fit') ||
          title.includes('style') ||
          title.includes('wear') ||
          title.includes('look') ||
          title.includes('fashion')
        );
      })
      .map((post, index) => {
        const title = post.data.title;
        
        // Extract keywords
        const words = title.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.length > 4 && !['outfit', 'style', 'fashion'].includes(word)) {
            fashionKeywords.add(word);
          }
        });

        // Detect style categories
        if (title.toLowerCase().includes('street')) trendingStyles.add('streetwear');
        if (title.toLowerCase().includes('casual')) trendingStyles.add('casual');
        if (title.toLowerCase().includes('formal')) trendingStyles.add('formal');
        if (title.toLowerCase().includes('smart')) trendingStyles.add('smart-casual');
        if (title.toLowerCase().includes('vintage')) trendingStyles.add('vintage');
        if (title.toLowerCase().includes('minimal')) trendingStyles.add('minimalist');

        return {
          id: `reddit-${Date.now()}-${index}`,
          title: post.data.title,
          description: `Popular on r/${post.data.subreddit} - ${post.data.score} upvotes`,
          image_url: post.data.thumbnail && post.data.thumbnail.startsWith('http') 
            ? post.data.thumbnail 
            : 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80',
          link: `https://reddit.com${post.data.permalink}`,
          score: post.data.score,
          subreddit: post.data.subreddit,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Generate AI context from Reddit trends
    const keywordArray = Array.from(fashionKeywords).slice(0, 15);
    const styleArray = Array.from(trendingStyles);
    
    const ai_context = trends.length > 0
      ? `Reddit Fashion Trends (week): Popular styles include ${styleArray.join(', ')}. ` +
        `Trending topics: ${keywordArray.join(', ')}. ` +
        `Community favorites from r/streetwear, r/malefashionadvice, and r/femalefashionadvice.`
      : 'No specific Reddit fashion trends found for this query.';

    console.log('Reddit AI context generated:', ai_context);

    return new Response(
      JSON.stringify({
        success: true,
        query,
        total_posts: trends.length,
        trending_styles: styleArray,
        trending_keywords: keywordArray,
        top_posts: trends,
        ai_context,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching Reddit trends:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        ai_context: '',
        top_posts: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
